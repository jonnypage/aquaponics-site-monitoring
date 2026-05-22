#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include <ArduinoJson.h>

#include "config.h"

namespace {

constexpr int kFallbackReportSeconds = 300;
constexpr int kFallbackSnapshotSeconds = 900;
constexpr unsigned long kWifiReconnectMs = 15000;

DeviceConfig g_cfg;
int g_reportIntervalSeconds = kFallbackReportSeconds;
int g_snapshotIntervalSeconds = kFallbackSnapshotSeconds;
bool g_captureImageNow = false;
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
  WiFi.begin(g_cfg.wifiSsid.c_str(), g_cfg.wifiPassword.c_str());
  return false;
}

float readDummy(int pin, float base, float span) {
  pinMode(static_cast<uint8_t>(pin), INPUT);
  const int raw = analogRead(pin);
  return base + (static_cast<float>(raw) / 1023.0f) * span;
}

void addReading(JsonObject readings, const String &sensorKey, int pin) {
  if (pin < 0) {
    return;
  }
  if (sensorKey == "temperature") {
    readings[sensorKey] = readDummy(pin, 20.0f, 10.0f);
  } else if (sensorKey == "ph") {
    readings[sensorKey] = readDummy(pin, 6.5f, 2.0f);
  } else if (sensorKey == "waterLevel") {
    readings[sensorKey] = readDummy(pin, 70.0f, 30.0f);
  } else if (sensorKey == "waterFlow") {
    readings[sensorKey] = readDummy(pin, 0.5f, 2.0f);
  } else {
    readings[sensorKey] = readDummy(pin, 0.0f, 1.0f);
  }
}

void appendReadings(JsonObject readings) {
  for (uint8_t i = 0; i < g_cfg.sensorCount; ++i) {
    addReading(readings, g_cfg.sensors[i].key, g_cfg.sensors[i].pin);
  }
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
  if (!commands["captureImageNow"].isNull()) {
    g_captureImageNow = commands["captureImageNow"].as<bool>();
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

  WiFiClient client;
  if (g_cfg.apiOrigin.startsWith("https://")) {
    WiFiClientSecure secure;
    secure.setInsecure();
    HTTPClient http;
    if (!http.begin(secure, g_cfg.apiOrigin + "/ingest")) {
      return false;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", g_cfg.apiKey);

    JsonDocument body;
    body["deviceId"] = g_cfg.deviceId;
    body["timestamp"] = iso8601Utc();
    JsonObject readings = body["readings"].to<JsonObject>();
    appendReadings(readings);

    String payload;
    serializeJson(body, payload);
    httpCode = http.POST(payload);
    responseBody = http.getString();
    responseHeaders = http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
    http.end();
    return httpCode > 0;
  }

  HTTPClient http;
  if (!http.begin(client, g_cfg.apiOrigin + "/ingest")) {
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", g_cfg.apiKey);

  JsonDocument body;
  body["deviceId"] = g_cfg.deviceId;
  body["timestamp"] = iso8601Utc();
  JsonObject readings = body["readings"].to<JsonObject>();
  appendReadings(readings);

  String payload;
  serializeJson(body, payload);
  httpCode = http.POST(payload);
  responseBody = http.getString();
  responseHeaders = http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
  http.end();
  return httpCode > 0;
}

// Minimal valid JPEG SOI + EOI for snapshot stub until a camera driver exists.
const uint8_t kStubJpeg[] = {0xFF, 0xD8, 0xFF, 0xD9};
const size_t kStubJpegLen = sizeof(kStubJpeg);

bool postSnapshot(int &httpCode, String &responseHeaders) {
  if (!ensureWifi()) {
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
  const size_t totalLen = head.length() + kStubJpegLen + tail.length();

  uint8_t *buf = new uint8_t[totalLen];
  if (!buf) {
    return false;
  }
  size_t off = 0;
  memcpy(buf + off, head.c_str(), head.length());
  off += head.length();
  memcpy(buf + off, kStubJpeg, kStubJpegLen);
  off += kStubJpegLen;
  memcpy(buf + off, tail.c_str(), tail.length());

  WiFiClient plain;
  WiFiClientSecure secure;
  HTTPClient http;
  const String url = g_cfg.apiOrigin + "/ingest/snapshot";
  const bool https = g_cfg.apiOrigin.startsWith("https://");

  if (https) {
    secure.setInsecure();
    if (!http.begin(secure, url)) {
      delete[] buf;
      return false;
    }
  } else if (!http.begin(plain, url)) {
    delete[] buf;
    return false;
  }

  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  http.addHeader("x-api-key", g_cfg.apiKey);
  httpCode = http.POST(buf, totalLen);
  responseHeaders = http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
  http.end();
  delete[] buf;
  return httpCode > 0;
}

bool shouldSendSnapshot() {
  if (g_captureImageNow) {
    return true;
  }
  if (!g_cfg.hasCamera) {
    return false;
  }
  const unsigned long intervalMs = static_cast<unsigned long>(g_snapshotIntervalSeconds) * 1000UL;
  return millis() - g_lastSnapshotMs >= intervalMs;
}

}  // namespace

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("aquaponics-node starting");

  if (!loadDeviceConfig(g_cfg)) {
    Serial.println("Device config not loaded — fix above and re-flash from Install");
    return;
  }

  Serial.print("Device ");
  Serial.print(g_cfg.deviceId);
  Serial.print(" API ");
  Serial.println(g_cfg.apiOrigin);

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
  }
}

void loop() {
  if (!ensureWifi()) {
    delay(500);
    return;
  }

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
