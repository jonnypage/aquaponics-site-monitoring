#include <WiFi.h>
#include <esp_log.h>

#include "aquaponics/app.h"
#include "aquaponics/net.h"
#include "config.h"
#include "sensors.h"

namespace {

#ifndef UD_WIFI_DEBUG
#define UD_WIFI_DEBUG 0
#endif

DeviceConfig g_cfg;
aquaponics::AquaponicsApp *g_app = nullptr;

#if UD_WIFI_DEBUG
void logWifiCredentialsDebug() {
  Serial.println("DEBUG WiFi credentials (UD_WIFI_DEBUG=1 — disable before production):");
  Serial.print("  SSID: [");
  Serial.print(g_cfg.wifiSsid);
  Serial.print("] len=");
  Serial.println(g_cfg.wifiSsid.length());
}
#endif

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(3000);
  Serial.println();
  Serial.println("esp32-s3 starting");
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
  Serial.println(g_cfg.apiOrigin);
  Serial.printf("Sensors configured: %u\n", g_cfg.sensorCount);
  Serial.flush();

  initSensorDrivers(g_cfg);

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

  g_app = new aquaponics::AquaponicsApp(g_cfg, appendSensorReadings);
}

void loop() {
  if (g_app == nullptr) {
    delay(1000);
    return;
  }
  g_app->loop();
}
