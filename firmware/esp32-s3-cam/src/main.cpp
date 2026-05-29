#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_log.h>
#include <time.h>

#include <ArduinoJson.h>

#include "camera.h"
#include "config.h"
#include "sensors.h"

namespace {

constexpr int kFallbackReportSeconds = 300;
constexpr int kFallbackSnapshotSeconds = 900;
constexpr unsigned long kWifiReconnectMs = 15000;

#ifndef UD_WIFI_DEBUG
#define UD_WIFI_DEBUG 0
#endif

DeviceConfig g_cfg;
int g_reportIntervalSeconds = kFallbackReportSeconds;
int g_snapshotIntervalSeconds = kFallbackSnapshotSeconds;
bool g_captureImageNow = false;
bool g_cameraInitAttempted = false;
unsigned long g_lastSnapshotMs = 0;
unsigned long g_lastWifiAttemptMs = 0;

String iso8601Utc() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

void logWifiStatusLine(const char *label) {
  Serial.print(label);
  Serial.print(" status=");
  Serial.println(WiFi.status());
}

#if UD_WIFI_DEBUG
void logWifiCredentialsDebug() {
  Serial.println("DEBUG WiFi credentials (UD_WIFI_DEBUG=1 — disable before production):");
  Serial.print("  SSID: [");
  Serial.print(g_cfg.wifiSsid);
  Serial.print("] len=");
  Serial.println(g_cfg.wifiSsid.length());
}
#endif

bool syncTime() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  for (int i = 0; i < 40; ++i) {
    if (time(nullptr) > 1577836800L) {
      return true;
    }
    delay(500);
  }
  return false;
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }
  const unsigned long now = millis();
  if (now - g_lastWifiAttemptMs < kWifiReconnectMs) {
    return false;
  }
  g_lastWifiAttemptMs = now;
  WiFi.disconnect();
#if UD_WIFI_DEBUG
  Serial.println("DEBUG WiFi reconnect attempt:");
  logWifiCredentialsDebug();
#endif
  WiFi.begin(g_cfg.wifiSsid.c_str(), g_cfg.wifiPassword.c_str());
  return false;
}

bool parseCommands(const String &body) {
  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    return false;
  }
  JsonObjectConst commands = doc["commands"].as<JsonObjectConst>();
  if (commands.isNull()) {
    return false;
  }
  if (!commands["reportIntervalSeconds"].isNull()) {
    g_reportIntervalSeconds = commands["reportIntervalSeconds"].as<int>();
  }
  if (!commands["snapshotIntervalSeconds"].isNull()) {
    g_snapshotIntervalSeconds = commands["snapshotIntervalSeconds"].as<int>();
  }
  if (!commands["hasCamera"].isNull()) {
    g_cfg.hasCamera = commands["hasCamera"].as<bool>();
  }
  if (!commands["captureImageNow"].isNull() && g_cfg.hasCamera) {
    g_captureImageNow = commands["captureImageNow"].as<bool>();
  } else {
    g_captureImageNow = false;
  }
  return true;
}

int parseRetryAfterSeconds(const String &headers) {
  const int idx = headers.indexOf("Retry-After:");
  if (idx < 0) {
    return 60;
  }
  String line = headers.substring(idx + 12);
  const int cr = line.indexOf('\n');
  if (cr >= 0) {
    line = line.substring(0, cr);
  }
  line.trim();
  return line.toInt() > 0 ? line.toInt() : 60;
}

bool postTelemetry(String &responseBody, int &httpCode, String &responseHeaders) {
  if (!ensureWifi()) {
    return false;
  }

  JsonDocument body;
  body["deviceId"] = g_cfg.deviceId;
  body["timestamp"] = iso8601Utc();
  JsonObject readings = body["readings"].to<JsonObject>();
  appendSensorReadings(readings, g_cfg, static_cast<float>(g_reportIntervalSeconds));

  String payload;
  serializeJson(body, payload);

  if (g_cfg.apiOrigin.startsWith("https://")) {
    WiFiClientSecure secure;
    secure.setInsecure();
    HTTPClient http;
    if (!http.begin(secure, g_cfg.apiOrigin + "/ingest")) {
      return false;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", g_cfg.apiKey);
    httpCode = http.POST(payload);
    responseBody = http.getString();
    responseHeaders =
        http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
    http.end();
    return httpCode > 0;
  }

  WiFiClient client;
  HTTPClient http;
  if (!http.begin(client, g_cfg.apiOrigin + "/ingest")) {
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", g_cfg.apiKey);
  httpCode = http.POST(payload);
  responseBody = http.getString();
  responseHeaders =
      http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
  http.end();
  return httpCode > 0;
}

bool postSnapshot(int &httpCode, String &responseHeaders) {
  if (!ensureWifi() || !g_cfg.hasCamera) {
    return false;
  }

  uint8_t *image = nullptr;
  size_t imageLen = 0;
  if (!captureCameraJpeg(&image, &imageLen)) {
    return false;
  }

  const String boundary = "----AquaponicsBoundary7d4f";
  const String meta = String("{\"deviceId\":\"") + g_cfg.deviceId + "\",\"timestamp\":\"" + iso8601Utc() + "\"}";

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

  WiFiClient plain;
  WiFiClientSecure secure;
  HTTPClient http;
  const String url = g_cfg.apiOrigin + "/ingest/snapshot";
  const bool https = g_cfg.apiOrigin.startsWith("https://");

  bool began = false;
  if (https) {
    secure.setInsecure();
    began = http.begin(secure, url);
  } else {
    began = http.begin(plain, url);
  }
  if (!began) {
    free(buf);
    return false;
  }

  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  http.addHeader("x-api-key", g_cfg.apiKey);
  httpCode = http.POST(buf, totalLen);
  responseHeaders =
      http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
  http.end();
  free(buf);
  return httpCode > 0;
}

bool shouldSendSnapshot() {
  if (!g_cfg.hasCamera) {
    g_captureImageNow = false;
    return false;
  }
  if (g_captureImageNow) {
    return true;
  }
  const unsigned long intervalMs = static_cast<unsigned long>(g_snapshotIntervalSeconds) * 1000UL;
  return millis() - g_lastSnapshotMs >= intervalMs;
}

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
    syncTime();
  } else {
    logWifiStatusLine("WiFi connect failed");
  }
}

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

void loop() {
  if (!ensureWifi()) {
    delay(500);
    return;
  }

  ensureCameraReady();

  String body;
  String headers;
  int code = 0;

  if (!postTelemetry(body, code, headers)) {
    delay(5000);
    return;
  }

  if (code == 429) {
    const int waitSec = parseRetryAfterSeconds(headers);
    Serial.printf("Rate limited, waiting %ds\n", waitSec);
    delay(static_cast<unsigned long>(waitSec) * 1000UL);
    return;
  }

  if (code >= 200 && code < 300) {
    parseCommands(body);
    Serial.printf("Telemetry OK, next report in %ds\n", g_reportIntervalSeconds);
  } else {
    Serial.printf("Telemetry HTTP %d: %s\n", code, body.c_str());
    delay(10000);
    return;
  }

  if (shouldSendSnapshot()) {
    int snapCode = 0;
    String snapHeaders;
    if (postSnapshot(snapCode, snapHeaders)) {
      if (snapCode == 429) {
        delay(static_cast<unsigned long>(parseRetryAfterSeconds(snapHeaders)) * 1000UL);
      } else if (snapCode >= 200 && snapCode < 300) {
        g_lastSnapshotMs = millis();
        g_captureImageNow = false;
        Serial.println("Snapshot uploaded");
      } else {
        Serial.printf("Snapshot HTTP %d\n", snapCode);
      }
    }
  }

  delay(static_cast<unsigned long>(g_reportIntervalSeconds) * 1000UL);
}
