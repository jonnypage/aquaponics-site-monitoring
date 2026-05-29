#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include <ArduinoJson.h>

#include "config.h"

namespace
{

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
  unsigned long g_lastSnapshotMs = 0;
  unsigned long g_lastWifiAttemptMs = 0;

  String iso8601Utc()
  {
    time_t now = time(nullptr);
    struct tm timeinfo;
    gmtime_r(&now, &timeinfo);
    char buf[32];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return String(buf);
  }

  void logWifiStatusLine(const char *label)
  {
    Serial.print(label);
    Serial.print(" status=");
    const uint8_t st = WiFi.status();
    Serial.print(st);
    switch (st)
    {
    case WL_IDLE_STATUS:
      Serial.println(" (IDLE)");
      break;
    case WL_NO_SSID_AVAIL:
      Serial.println(" (NO_SSID_AVAIL)");
      break;
    case WL_SCAN_COMPLETED:
      Serial.println(" (SCAN_COMPLETED)");
      break;
    case WL_CONNECTED:
      Serial.println(" (CONNECTED)");
      break;
    case WL_CONNECT_FAILED:
      Serial.println(" (CONNECT_FAILED)");
      break;
    case WL_CONNECTION_LOST:
      Serial.println(" (CONNECTION_LOST)");
      break;
    case WL_DISCONNECTED:
      Serial.println(" (DISCONNECTED)");
      break;
    default:
      Serial.println(" (?)");
      break;
    }
  }

#if UD_WIFI_DEBUG
  void logWifiCredentialsDebug()
  {
    Serial.println("DEBUG WiFi credentials (UD_WIFI_DEBUG=1 — disable before production):");
    Serial.print("  SSID: [");
    Serial.print(g_cfg.wifiSsid);
    Serial.print("] len=");
    Serial.println(g_cfg.wifiSsid.length());
    Serial.print("  password: [");
    Serial.print(g_cfg.wifiPassword);
    Serial.print("] len=");
    Serial.println(g_cfg.wifiPassword.length());
  }
#endif

  bool syncTime()
  {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    for (int i = 0; i < 40; ++i)
    {
      if (time(nullptr) > 1577836800L)
      {
        return true;
      }
      delay(500);
    }
    return false;
  }

  bool ensureWifi()
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      return true;
    }
    const unsigned long now = millis();
    if (now - g_lastWifiAttemptMs < kWifiReconnectMs)
    {
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

  /** Simulated reading: ADC + uniform random + jitter so ingest flatline heuristics do not false-positive. */
  float readDummyWithJitter(int pin, float base, float span, float jitterAmp)
  {
    pinMode(static_cast<uint8_t>(pin), INPUT);
    const int raw = analogRead(pin);
    randomSeed(static_cast<unsigned long>(micros()) ^ static_cast<unsigned long>(raw));
    const float adcPart = (static_cast<float>(raw) / 1023.0f) * span * 0.35f;
    const float randPart = (static_cast<float>(random(0, 10001)) / 10000.0f) * span * 0.65f;
    const float jitter = (static_cast<float>(random(0, 2001) - 1000) / 1000.0f) * jitterAmp;
    const float v = base + adcPart + randPart + jitter;
    return roundf(v * 1000.0f) / 1000.0f;
  }

  void addReading(JsonObject readings, const String &sensorKey, const String &sensorType, int pin)
  {
    if (pin < 0)
    {
      return;
    }
    if (sensorType == "temperature")
    {
      // Flatline threshold ≤ 0.02°C over 10 readings
      readings[sensorKey] = readDummyWithJitter(pin, 20.0f, 10.0f, 0.06f);
    }
    else if (sensorType == "ph")
    {
      // Flatline ≤ 0.008; keep jitter small to limit false ph_drift
      readings[sensorKey] = readDummyWithJitter(pin, 6.5f, 2.0f, 0.012f);
    }
    else if (sensorType == "waterLevel")
    {
      readings[sensorKey] = readDummyWithJitter(pin, 70.0f, 30.0f, 0.25f);
    }
    else if (sensorType == "waterFlow")
    {
      readings[sensorKey] = readDummyWithJitter(pin, 0.5f, 2.0f, 0.02f);
    }
    else
    {
      readings[sensorKey] = readDummyWithJitter(pin, 0.0f, 1.0f, 0.05f);
    }
  }

  void appendReadings(JsonObject readings)
  {
    for (uint8_t i = 0; i < g_cfg.sensorCount; ++i)
    {
      addReading(readings, g_cfg.sensors[i].key, g_cfg.sensors[i].sensorType, g_cfg.sensors[i].pin);
    }
  }

  bool parseCommands(const String &body)
  {
    JsonDocument doc;
    if (deserializeJson(doc, body))
    {
      return false;
    }
    JsonObjectConst commands = doc["commands"].as<JsonObjectConst>();
    if (commands.isNull())
    {
      return false;
    }
    if (!commands["reportIntervalSeconds"].isNull())
    {
      g_reportIntervalSeconds = commands["reportIntervalSeconds"].as<int>();
    }
    if (!commands["snapshotIntervalSeconds"].isNull())
    {
      g_snapshotIntervalSeconds = commands["snapshotIntervalSeconds"].as<int>();
    }
    if (!commands["hasCamera"].isNull())
    {
      g_cfg.hasCamera = commands["hasCamera"].as<bool>();
    }
    if (!commands["captureImageNow"].isNull() && g_cfg.hasCamera)
    {
      g_captureImageNow = commands["captureImageNow"].as<bool>();
    }
    else
    {
      g_captureImageNow = false;
    }
    return true;
  }

  int parseRetryAfterSeconds(const String &headers)
  {
    const int idx = headers.indexOf("Retry-After:");
    if (idx < 0)
    {
      return 60;
    }
    String line = headers.substring(idx + 12);
    const int cr = line.indexOf('\n');
    if (cr >= 0)
    {
      line = line.substring(0, cr);
    }
    line.trim();
    return line.toInt() > 0 ? line.toInt() : 60;
  }

  bool postTelemetry(String &responseBody, int &httpCode, String &responseHeaders)
  {
    if (!ensureWifi())
    {
      return false;
    }

    WiFiClient client;
    if (g_cfg.apiOrigin.startsWith("https://"))
    {
      WiFiClientSecure secure;
      secure.setInsecure();
      HTTPClient http;
      if (!http.begin(secure, g_cfg.apiOrigin + "/ingest"))
      {
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
    if (!http.begin(client, g_cfg.apiOrigin + "/ingest"))
    {
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

  // Small placeholder JPEG — ESP8266 heap cannot hold 640×360 (~48 KiB) plus multipart body.
  constexpr char kPlacekittenUrl[] = "https://placekittens.com/320/180";
  constexpr size_t kSnapshotMaxBytes = 16384;
  constexpr unsigned long kStreamIdleMs = 5000;

  size_t readAvail(WiFiClient *stream, uint8_t *dest, size_t destCap)
  {
    const int avail = stream->available();
    if (avail <= 0 || destCap == 0)
    {
      return 0;
    }
    const size_t want = static_cast<size_t>(avail);
    return stream->readBytes(dest, want < destCap ? want : destCap);
  }

  /** Read GET body when Content-Length is missing (chunked) or declared. */
  bool readHttpResponseBody(HTTPClient &http, uint8_t **outBuf, size_t *outLen, size_t maxBytes)
  {
    *outBuf = nullptr;
    *outLen = 0;

    WiFiClient *stream = http.getStreamPtr();
    if (!stream)
    {
      return false;
    }

    const int declared = http.getSize();
    if (declared > 0 && static_cast<size_t>(declared) <= maxBytes)
    {
      uint8_t *image = static_cast<uint8_t *>(malloc(static_cast<size_t>(declared)));
      if (!image)
      {
        return false;
      }
      const size_t got = stream->readBytes(image, static_cast<size_t>(declared));
      if (got != static_cast<size_t>(declared))
      {
        Serial.printf("Snapshot: short read %u/%d\n", static_cast<unsigned>(got), declared);
        free(image);
        return false;
      }
      *outBuf = image;
      *outLen = got;
      return true;
    }

    uint8_t *image = static_cast<uint8_t *>(malloc(maxBytes));
    if (!image)
    {
      return false;
    }

    size_t got = 0;
    unsigned long lastDataMs = millis();
    while (got < maxBytes && (http.connected() || stream->available() > 0))
    {
      const size_t chunk = readAvail(stream, image + got, maxBytes - got);
      if (chunk > 0)
      {
        got += chunk;
        lastDataMs = millis();
        continue;
      }
      if (!http.connected())
      {
        break;
      }
      if (millis() - lastDataMs > kStreamIdleMs)
      {
        break;
      }
      delay(1);
    }

    if (got == 0)
    {
      Serial.println("Snapshot: empty response body");
      free(image);
      return false;
    }

    uint8_t *shrunk = static_cast<uint8_t *>(realloc(image, got));
    if (shrunk != nullptr)
    {
      image = shrunk;
    }

    *outBuf = image;
    *outLen = got;
    if (declared <= 0)
    {
      Serial.printf("Snapshot: read %u bytes (chunked)\n", static_cast<unsigned>(got));
    }
    return true;
  }

  bool fetchPlacekittenJpeg(uint8_t **outBuf, size_t *outLen)
  {
    *outBuf = nullptr;
    *outLen = 0;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.setTimeout(20000);
    if (!http.begin(client, kPlacekittenUrl))
    {
      Serial.println("Snapshot: placekittens begin failed");
      return false;
    }

    const int code = http.GET();
    if (code != HTTP_CODE_OK)
    {
      Serial.printf("Snapshot: placekittens HTTP %d\n", code);
      http.end();
      return false;
    }

    uint8_t *image = nullptr;
    size_t imageLen = 0;
    if (!readHttpResponseBody(http, &image, &imageLen, kSnapshotMaxBytes))
    {
      http.end();
      return false;
    }
    http.end();

    if (imageLen > kSnapshotMaxBytes)
    {
      Serial.printf("Snapshot: body too large %u\n", static_cast<unsigned>(imageLen));
      free(image);
      return false;
    }
    if (imageLen < 4 || image[0] != 0xFF || image[1] != 0xD8)
    {
      Serial.println("Snapshot: response is not JPEG");
      free(image);
      return false;
    }

    *outBuf = image;
    *outLen = imageLen;
    Serial.printf("Snapshot: placekitten %u bytes\n", static_cast<unsigned>(imageLen));
    return true;
  }

  bool postSnapshot(int &httpCode, String &responseHeaders)
  {
    if (!ensureWifi() || !g_cfg.hasCamera)
    {
      return false;
    }

    uint8_t *image = nullptr;
    size_t imageLen = 0;
    if (!fetchPlacekittenJpeg(&image, &imageLen))
    {
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
    if (!buf)
    {
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
    if (https)
    {
      secure.setInsecure();
      began = http.begin(secure, url);
    }
    else
    {
      began = http.begin(plain, url);
    }
    if (!began)
    {
      free(buf);
      return false;
    }

    http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
    http.addHeader("x-api-key", g_cfg.apiKey);
    httpCode = http.POST(buf, totalLen);
    responseHeaders = http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
    http.end();
    free(buf);
    return httpCode > 0;
  }

  bool shouldSendSnapshot()
  {
    if (!g_cfg.hasCamera)
    {
      g_captureImageNow = false;
      return false;
    }
    if (g_captureImageNow)
    {
      return true;
    }
    const unsigned long intervalMs = static_cast<unsigned long>(g_snapshotIntervalSeconds) * 1000UL;
    return millis() - g_lastSnapshotMs >= intervalMs;
  }

} // namespace

void setup()
{
  Serial.begin(115200);
  Serial.println();
  Serial.println("esp-8266-d1-mini starting");

  if (!loadDeviceConfig(g_cfg))
  {
    Serial.println("Device config not loaded — fix above and re-flash from Install");
    return;
  }

  Serial.print("Device ");
  Serial.print(g_cfg.deviceId);
  Serial.print(" API ");
  Serial.print(g_cfg.apiOrigin);
  Serial.print(" camera ");
  Serial.println(g_cfg.hasCamera ? "yes" : "no");

#if UD_WIFI_DEBUG
  logWifiCredentialsDebug();
#endif

  WiFi.mode(WIFI_STA);
  WiFi.begin(g_cfg.wifiSsid.c_str(), g_cfg.wifiPassword.c_str());

  Serial.print("Connecting WiFi");
  for (int i = 0; i < 60 && WiFi.status() != WL_CONNECTED; ++i)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    syncTime();
  }
  else
  {
    logWifiStatusLine("WiFi connect failed");
  }
}

void loop()
{
  if (!ensureWifi())
  {
    delay(500);
    return;
  }

  String body;
  String headers;
  int code = 0;

  if (!postTelemetry(body, code, headers))
  {
    delay(5000);
    return;
  }

  if (code == 429)
  {
    const int waitSec = parseRetryAfterSeconds(headers);
    Serial.printf("Rate limited, waiting %ds\n", waitSec);
    delay(static_cast<unsigned long>(waitSec) * 1000UL);
    return;
  }

  if (code >= 200 && code < 300)
  {
    parseCommands(body);
    Serial.printf("Telemetry OK, next report in %ds\n", g_reportIntervalSeconds);
  }
  else
  {
    Serial.printf("Telemetry HTTP %d: %s\n", code, body.c_str());
    delay(10000);
    return;
  }

  if (shouldSendSnapshot())
  {
    int snapCode = 0;
    String snapHeaders;
    if (postSnapshot(snapCode, snapHeaders))
    {
      if (snapCode == 429)
      {
        delay(static_cast<unsigned long>(parseRetryAfterSeconds(snapHeaders)) * 1000UL);
      }
      else if (snapCode >= 200 && snapCode < 300)
      {
        g_lastSnapshotMs = millis();
        g_captureImageNow = false;
        Serial.println("Snapshot uploaded");
      }
      else
      {
        Serial.printf("Snapshot HTTP %d\n", snapCode);
      }
    }
  }

  delay(static_cast<unsigned long>(g_reportIntervalSeconds) * 1000UL);
}
