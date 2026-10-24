#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include <ArduinoJson.h>

#include "config.h"
#include "sensors.h"

namespace
{

  constexpr int kFallbackCheckinSeconds = 300;
  constexpr int kFallbackReportSeconds = 1800;
  constexpr int kFallbackSnapshotSeconds = 3600;
  constexpr unsigned long kWifiReconnectMs = 15000;

#ifndef UD_WIFI_DEBUG
#define UD_WIFI_DEBUG 0
#endif

  DeviceConfig g_cfg;
  int g_checkinIntervalSeconds = kFallbackCheckinSeconds;
  int g_reportIntervalSeconds = kFallbackReportSeconds;
  int g_snapshotIntervalSeconds = kFallbackSnapshotSeconds;
  bool g_captureImageNow = false;
  bool g_sendTelemetryNow = false;
  unsigned long g_lastCheckinMs = 0;
  unsigned long g_lastReportMs = 0;
  unsigned long g_lastSnapshotMs = 0;
  unsigned long g_lastWifiAttemptMs = 0;

  int intervalOrFallback(int value, int fallback)
  {
    return value > 0 ? value : fallback;
  }

  bool intervalElapsed(unsigned long lastMs, int intervalSeconds, unsigned long nowMs)
  {
    if (lastMs == 0)
    {
      return true;
    }
    const int intervalSec = intervalOrFallback(intervalSeconds, 1);
    return nowMs - lastMs >= static_cast<unsigned long>(intervalSec) * 1000UL;
  }

  unsigned long remainingIntervalSeconds(unsigned long lastMs, int intervalSeconds, unsigned long nowMs)
  {
    const int intervalSec = intervalOrFallback(intervalSeconds, 1);
    if (lastMs == 0)
    {
      return 0;
    }
    const unsigned long intervalMs = static_cast<unsigned long>(intervalSec) * 1000UL;
    const unsigned long elapsed = nowMs - lastMs;
    if (elapsed >= intervalMs)
    {
      return 0;
    }
    return (intervalMs - elapsed + 999UL) / 1000UL;
  }

  String iso8601Utc()
  {
    time_t now = time(nullptr);
    struct tm timeinfo;
    gmtime_r(&now, &timeinfo);
    char buf[32];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return String(buf);
  }

#if UD_WIFI_DEBUG
  void logWifiCredentialsDebug()
  {
    Serial.println("DEBUG WiFi credentials (UD_WIFI_DEBUG=1 — disable before production):");
    Serial.print("  SSID: [");
    Serial.print(g_cfg.wifiSsid);
    Serial.print("] len=");
    Serial.println(g_cfg.wifiSsid.length());
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
    WiFi.begin(g_cfg.wifiSsid.c_str(), g_cfg.wifiPassword.c_str());
    return false;
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
    if (!commands["checkinIntervalSeconds"].isNull())
    {
      const int value = commands["checkinIntervalSeconds"].as<int>();
      if (value > 0)
      {
        g_checkinIntervalSeconds = value;
      }
    }
    if (!commands["reportIntervalSeconds"].isNull())
    {
      const int value = commands["reportIntervalSeconds"].as<int>();
      if (value > 0)
      {
        g_reportIntervalSeconds = value;
      }
    }
    if (!commands["snapshotIntervalSeconds"].isNull())
    {
      const int value = commands["snapshotIntervalSeconds"].as<int>();
      if (value > 0)
      {
        g_snapshotIntervalSeconds = value;
      }
    }
    if (!commands["hasCamera"].isNull())
    {
      g_cfg.hasCamera = commands["hasCamera"].as<bool>();
    }
    if (!commands["captureImageNow"].isNull())
    {
      g_captureImageNow = g_cfg.hasCamera && commands["captureImageNow"].as<bool>();
    }
    else
    {
      g_captureImageNow = false;
    }
    if (!commands["sendTelemetryNow"].isNull())
    {
      g_sendTelemetryNow = commands["sendTelemetryNow"].as<bool>();
    }
    else
    {
      g_sendTelemetryNow = false;
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

  bool postJson(const String &path, const String &jsonBody, String &responseBody, int &httpCode,
                String &responseHeaders)
  {
    WiFiClient plain;
    WiFiClientSecure secure;
    HTTPClient http;
    const String url = g_cfg.apiOrigin + path;
    bool began = false;
    if (g_cfg.apiOrigin.startsWith("https://"))
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
      return false;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", g_cfg.apiKey);
    httpCode = http.POST(jsonBody);
    responseBody = http.getString();
    responseHeaders = http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
    http.end();
    return httpCode > 0;
  }

  bool postCheckin(String &responseBody, int &httpCode, String &responseHeaders)
  {
    if (!ensureWifi())
    {
      return false;
    }
    JsonDocument body;
    body["deviceId"] = g_cfg.deviceId;
    body["timestamp"] = iso8601Utc();
    String payload;
    serializeJson(body, payload);
    return postJson("/checkin", payload, responseBody, httpCode, responseHeaders);
  }

  bool postTelemetry(float elapsedSeconds, String &responseBody, int &httpCode, String &responseHeaders)
  {
    if (!ensureWifi())
    {
      return false;
    }
    JsonDocument body;
    body["deviceId"] = g_cfg.deviceId;
    body["timestamp"] = iso8601Utc();
    JsonObject readings = body["readings"].to<JsonObject>();
    const float elapsed = elapsedSeconds > 0.0f ? elapsedSeconds : static_cast<float>(g_reportIntervalSeconds);
    appendSensorReadings(readings, g_cfg, elapsed);
    String payload;
    serializeJson(body, payload);
    return postJson("/ingest", payload, responseBody, httpCode, responseHeaders);
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

  bool shouldCheckin(unsigned long nowMs)
  {
    return intervalElapsed(g_lastCheckinMs, g_checkinIntervalSeconds, nowMs);
  }

  bool shouldSendTelemetry(unsigned long nowMs)
  {
    if (g_sendTelemetryNow)
    {
      return true;
    }
    return intervalElapsed(g_lastReportMs, g_reportIntervalSeconds, nowMs);
  }

  bool shouldSendSnapshot(unsigned long nowMs)
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
    return intervalElapsed(g_lastSnapshotMs, g_snapshotIntervalSeconds, nowMs);
  }

  unsigned long sleepSeconds(unsigned long nowMs)
  {
    unsigned long sleepSec = remainingIntervalSeconds(g_lastCheckinMs, g_checkinIntervalSeconds, nowMs);
    const unsigned long reportSec = remainingIntervalSeconds(g_lastReportMs, g_reportIntervalSeconds, nowMs);
    if (reportSec < sleepSec)
    {
      sleepSec = reportSec;
    }
    if (g_cfg.hasCamera)
    {
      const unsigned long snapSec = remainingIntervalSeconds(g_lastSnapshotMs, g_snapshotIntervalSeconds, nowMs);
      if (snapSec < sleepSec)
      {
        sleepSec = snapSec;
      }
    }
    return sleepSec < 1 ? 1 : sleepSec;
  }

} // namespace

void setup()
{
  Serial.begin(115200);
  Serial.println();
  Serial.println("esp-8266-d1-mini starting");
  Serial.flush();

  if (!loadDeviceConfig(g_cfg))
  {
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
    Serial.print("WiFi connect failed status=");
    Serial.println(WiFi.status());
  }
}

void loop()
{
  if (!ensureWifi())
  {
    delay(500);
    return;
  }

  const unsigned long wakeMs = millis();

  // Check-in is rate-limited to checkinIntervalSeconds. Telemetry/snapshots may be due sooner.
  if (shouldCheckin(wakeMs))
  {
    String body;
    String headers;
    int code = 0;

    if (!postCheckin(body, code, headers))
    {
      delay(5000);
      return;
    }

    if (code == 429)
    {
      const int waitSec = parseRetryAfterSeconds(headers);
      Serial.printf("Check-in rate limited, waiting %ds\n", waitSec);
      delay(static_cast<unsigned long>(waitSec) * 1000UL);
      return;
    }

    if (code < 200 || code >= 300)
    {
      Serial.printf("Check-in HTTP %d: %s\n", code, body.c_str());
      delay(10000);
      return;
    }

    g_lastCheckinMs = wakeMs;
    parseCommands(body);
    Serial.printf("Check-in OK (checkin=%ds report=%ds snapshot=%ds)\n", g_checkinIntervalSeconds,
                  g_reportIntervalSeconds, g_snapshotIntervalSeconds);
  }

  if (shouldSendTelemetry(wakeMs))
  {
    const float elapsedSec =
        g_lastReportMs == 0 ? static_cast<float>(g_reportIntervalSeconds)
                            : static_cast<float>(wakeMs - g_lastReportMs) / 1000.0f;

    String ingestBody;
    String ingestHeaders;
    int ingestCode = 0;
    if (!postTelemetry(elapsedSec, ingestBody, ingestCode, ingestHeaders))
    {
      delay(5000);
      return;
    }

    if (ingestCode == 429)
    {
      delay(static_cast<unsigned long>(parseRetryAfterSeconds(ingestHeaders)) * 1000UL);
      return;
    }

    if (ingestCode >= 200 && ingestCode < 300)
    {
      g_lastReportMs = wakeMs;
      parseCommands(ingestBody);
      Serial.println("Telemetry uploaded");
    }
    else
    {
      Serial.printf("Telemetry HTTP %d: %s\n", ingestCode, ingestBody.c_str());
      delay(10000);
      return;
    }
  }

  if (shouldSendSnapshot(wakeMs))
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
        g_lastSnapshotMs = wakeMs;
        g_captureImageNow = false;
        Serial.println("Snapshot uploaded");
      }
      else
      {
        Serial.printf("Snapshot HTTP %d\n", snapCode);
      }
    }
  }

  const unsigned long waitSec = sleepSeconds(millis());
  Serial.printf("Next wake in %lus (checkin=%ds report=%ds snapshot=%ds)\n", waitSec,
                g_checkinIntervalSeconds, g_reportIntervalSeconds, g_snapshotIntervalSeconds);
  delay(waitSec * 1000UL);
}
