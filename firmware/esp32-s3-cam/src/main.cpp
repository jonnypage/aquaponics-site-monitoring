#include <WiFi.h>
#include <esp_log.h>

#include "aquaponics/app.h"
#include "aquaponics/net.h"
#include "camera.h"
#include "config.h"
#include "sensors.h"

namespace {

#ifndef UD_WIFI_DEBUG
#define UD_WIFI_DEBUG 0
#endif

DeviceConfig g_cfg;
aquaponics::AquaponicsApp *g_app = nullptr;
bool g_cameraInitAttempted = false;

#if UD_WIFI_DEBUG
void logWifiCredentialsDebug() {
  Serial.println("DEBUG WiFi credentials (UD_WIFI_DEBUG=1 — disable before production):");
  Serial.print("  SSID: [");
  Serial.print(g_cfg.wifiSsid);
  Serial.print("] len=");
  Serial.println(g_cfg.wifiSsid.length());
}
#endif

void ensureCameraReady() {
  if (g_cameraInitAttempted || !g_cfg.hasCamera) {
    return;
  }
  g_cameraInitAttempted = true;
  Serial.println("Initializing camera…");
  Serial.flush();
  if (!initDeviceCamera(true)) {
    Serial.println("Camera disabled — telemetry continues without snapshots");
    g_cfg.hasCamera = false;
  }
}

bool postSnapshot(int &httpCode, String &responseHeaders) {
  if (!g_cfg.hasCamera) {
    return false;
  }

  uint8_t *image = nullptr;
  size_t imageLen = 0;
  if (!captureCameraJpeg(&image, &imageLen)) {
    return false;
  }

  const String boundary = "----AquaponicsBoundary7d4f";
  const String meta =
      String("{\"deviceId\":\"") + g_cfg.deviceId + "\",\"timestamp\":\"" + aquaponics::iso8601Utc() + "\"}";

  String head = "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"metadata\"\r\n\r\n";
  head += meta + "\r\n";
  head += "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"image\"; filename=\"snap.jpg\"\r\n";
  head += "Content-Type: image/jpeg\r\n\r\n";

  const String tail = "\r\n--" + boundary + "--\r\n";
  const size_t totalLen = head.length() + imageLen + tail.length();

  uint8_t *buf = static_cast<uint8_t *>(malloc(totalLen));
  if (!buf) {
    free(image);
    return false;
  }
  size_t off = 0;
  memcpy(buf + off, head.c_str(), head.length());
  off += head.length();
  memcpy(buf + off, image, imageLen);
  off += imageLen;
  memcpy(buf + off, tail.c_str(), tail.length());
  free(image);

  const bool ok = aquaponics::httpPostBinary(
      g_cfg.apiOrigin,
      "/ingest/snapshot",
      g_cfg.apiKey,
      buf,
      totalLen,
      "multipart/form-data; boundary=" + boundary,
      httpCode,
      responseHeaders);
  free(buf);
  return ok;
}

void loopHook() { ensureCameraReady(); }

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(3000);
  Serial.println();
  Serial.println("esp32-s3-cam starting");
  Serial.printf("PSRAM: %s\n", psramFound() ? "yes" : "no");
  Serial.flush();
  ESP_LOGI("boot", "setup after Serial");

  if (!loadDeviceConfig(g_cfg)) {
    Serial.println("Device config not loaded — fix above and re-flash from Install");
    Serial.flush();
    return;
  }

  Serial.print("Device ");
  Serial.print(g_cfg.deviceId);
  Serial.print(" API ");
  Serial.print(g_cfg.apiOrigin);
  Serial.print(" camera ");
  Serial.println(g_cfg.hasCamera ? "yes" : "no");
  Serial.printf("Sensors configured: %u\n", g_cfg.sensorCount);
  Serial.flush();

  initSensorDrivers(g_cfg);
  Serial.println("Camera init deferred to loop (avoids setup hang on CAM boards)");

#if UD_WIFI_DEBUG
  logWifiCredentialsDebug();
#endif

  WiFi.mode(WIFI_STA);
  WiFi.begin(g_cfg.wifiSsid.c_str(), g_cfg.wifiPassword.c_str());

  Serial.print("Connecting WiFi");
  for (int i = 0; i < 60 && WiFi.status() != WL_CONNECTED; ++i) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    aquaponics::syncTime();
  } else {
    Serial.print("WiFi connect failed status=");
    Serial.println(WiFi.status());
  }

  g_app = new aquaponics::AquaponicsApp(g_cfg, appendSensorReadings, postSnapshot, loopHook);
}

void loop() {
  if (g_app == nullptr) {
    delay(1000);
    return;
  }
  g_app->loop();
}
