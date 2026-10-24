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
  constexpr unsigned long kWifiReconnectMs = 15000;
  constexpr unsigned long kWifiConnectWaitMs = 15000;
  constexpr unsigned long kHttpTimeoutMs = 15000;
  constexpr unsigned long kSleepChunkMs = 1000;
  constexpr unsigned long kTelemetryFailBackoffMs = 30000;
  constexpr unsigned long kCheckinFailBackoffMs = 5000;
  // Server-controlled intervals are clamped so interval * 1000 can never overflow 32 bits.
  constexpr int kMaxIntervalSeconds = 7 * 24 * 60 * 60;

  // Anything before 2020-01-01 UTC means the clock was never set by NTP.
  constexpr long kMinValidEpoch = 1577836800L;
  constexpr unsigned long kNtpRetryMs = 60000;
  constexpr int kNtpBootAttempts = 40;  // x 500 ms
  constexpr int kNtpRetryAttempts = 20; // x 500 ms

#ifndef UD_WIFI_DEBUG
#define UD_WIFI_DEBUG 0
#endif

  // Maintenance reboot after 7 days of uptime. Far below the ~49 day millis() wrap, needs no clock.
  constexpr unsigned long kRebootAfterUptimeMs = 7UL * 24UL * 60UL * 60UL * 1000UL;

  DeviceConfig g_cfg;
  bool g_configLoaded = false;
  int g_checkinIntervalSeconds = kFallbackCheckinSeconds;
  int g_reportIntervalSeconds = kFallbackReportSeconds;
  // False until a check-in/ingest response supplies intervals; logged so defaults are never mistaken for server values.
  bool g_intervalsFromServer = false;
  bool g_sendTelemetryNow = false;
  unsigned long g_lastCheckinMs = 0;
  unsigned long g_lastReportMs = 0;
  unsigned long g_lastWifiAttemptMs = 0;
  unsigned long g_lastNtpAttemptMs = 0;
  unsigned long g_checkinBackoffUntilMs = 0;
  unsigned long g_telemetryBackoffUntilMs = 0;

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

  bool clockIsSet()
  {
    return time(nullptr) > kMinValidEpoch;
  }

  /** (Re)start SNTP and wait up to attempts x 500 ms for the clock to be set. */
  bool syncTime(int attempts)
  {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    for (int i = 0; i < attempts; ++i)
    {
      if (clockIsSet())
      {
        return true;
      }
      delay(500);
    }
    return clockIsSet();
  }

  /**
   * Telemetry and check-ins carry the device clock, so nothing is sent while it reads 1970.
   * Retries NTP at most once per kNtpRetryMs.
   */
  bool ensureClock()
  {
    if (clockIsSet())
    {
      return true;
    }
    const unsigned long now = millis();
    if (g_lastNtpAttemptMs != 0 && now - g_lastNtpAttemptMs < kNtpRetryMs)
    {
      return false;
    }
    g_lastNtpAttemptMs = now;
    Serial.println("Clock not set, retrying NTP");
    if (syncTime(kNtpRetryAttempts))
    {
      Serial.println("NTP synced");
      return true;
    }
    Serial.println("NTP failed, will retry");
    return false;
  }

  /** Restart after 7 days of uptime. Only called between requests, never mid-HTTP. */
  void maybeWeeklyReboot()
  {
    if (millis() < kRebootAfterUptimeMs)
    {
      return;
    }
    Serial.println("Weekly maintenance reboot (7 days uptime)");
    Serial.flush();
    delay(200);
    ESP.restart();
  }

  bool ensureWifi()
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      return true;
    }
    const unsigned long now = millis();
    if (g_lastWifiAttemptMs != 0 && now - g_lastWifiAttemptMs < kWifiReconnectMs)
    {
      return false;
    }
    g_lastWifiAttemptMs = now;
    WiFi.disconnect();
    WiFi.begin(g_cfg.wifiSsid.c_str(), g_cfg.wifiPassword.c_str());
    Serial.print("Connecting WiFi");
    const unsigned long giveUpMs = millis() + kWifiConnectWaitMs;
    while (WiFi.status() != WL_CONNECTED && static_cast<long>(giveUpMs - millis()) > 0)
    {
      delay(500);
      Serial.print(".");
    }
    Serial.println();
    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.print("WiFi connect failed status=");
      Serial.println(WiFi.status());
      return false;
    }
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  bool parseCommands(const String &body)
  {
    JsonDocument doc;
    const DeserializationError err = deserializeJson(doc, body);
    if (err)
    {
      Serial.printf("Commands: JSON parse failed (%s)\n", err.c_str());
      return false;
    }
    JsonObjectConst commands = doc["commands"].as<JsonObjectConst>();
    if (commands.isNull())
    {
      Serial.println("Commands: missing commands object");
      return false;
    }
    if (!commands["checkinIntervalSeconds"].isNull())
    {
      const int value = commands["checkinIntervalSeconds"].as<int>();
      if (value > 0)
      {
        g_checkinIntervalSeconds = value > kMaxIntervalSeconds ? kMaxIntervalSeconds : value;
        g_intervalsFromServer = true;
      }
    }
    if (!commands["reportIntervalSeconds"].isNull())
    {
      const int value = commands["reportIntervalSeconds"].as<int>();
      if (value > 0)
      {
        g_reportIntervalSeconds = value > kMaxIntervalSeconds ? kMaxIntervalSeconds : value;
        g_intervalsFromServer = true;
      }
    }
    // hasCamera / snapshot / captureImageNow are ignored: this board has no camera.
    if (!commands["sendTelemetryNow"].isNull())
    {
      g_sendTelemetryNow = commands["sendTelemetryNow"].as<bool>();
    }
    else
    {
      g_sendTelemetryNow = false;
    }
    Serial.printf("Commands applied (checkin=%ds report=%ds sendNow=%d)\n", g_checkinIntervalSeconds,
                  g_reportIntervalSeconds, g_sendTelemetryNow ? 1 : 0);
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
    static const char *kCollectHeaders[] = {"Retry-After"};
    http.collectHeaders(kCollectHeaders, 1);
    http.setTimeout(kHttpTimeoutMs);
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

  /**
   * Returns false when nothing was sent. `noReadings` is set when every sensor failed: the API rejects an
   * empty `readings` object with 400, so the upload is skipped instead.
   */
  bool postTelemetry(float elapsedSeconds, String &responseBody, int &httpCode, String &responseHeaders,
                     bool &noReadings)
  {
    noReadings = false;
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
    if (readings.size() == 0)
    {
      noReadings = true;
      return false;
    }
    String payload;
    serializeJson(body, payload);
    return postJson("/ingest", payload, responseBody, httpCode, responseHeaders);
  }

  bool isBackoffActive(unsigned long backoffUntilMs, unsigned long nowMs)
  {
    return backoffUntilMs != 0 && nowMs < backoffUntilMs;
  }

  unsigned long deadlineFromLast(unsigned long lastMs, int intervalSeconds, unsigned long nowMs)
  {
    if (lastMs == 0)
    {
      return nowMs;
    }
    const int intervalSec = intervalOrFallback(intervalSeconds, 1);
    return lastMs + static_cast<unsigned long>(intervalSec) * 1000UL;
  }

  unsigned long applyBackoff(unsigned long dueMs, unsigned long backoffUntilMs, unsigned long nowMs)
  {
    if (isBackoffActive(backoffUntilMs, nowMs) && backoffUntilMs > dueMs)
    {
      return backoffUntilMs;
    }
    return dueMs;
  }

  bool shouldCheckin(unsigned long nowMs)
  {
    if (isBackoffActive(g_checkinBackoffUntilMs, nowMs))
    {
      return false;
    }
    return intervalElapsed(g_lastCheckinMs, g_checkinIntervalSeconds, nowMs);
  }

  bool shouldSendTelemetry(unsigned long nowMs)
  {
    if (isBackoffActive(g_telemetryBackoffUntilMs, nowMs))
    {
      return false;
    }
    if (g_sendTelemetryNow)
    {
      return true;
    }
    return intervalElapsed(g_lastReportMs, g_reportIntervalSeconds, nowMs);
  }

  unsigned long nextWakeMs(unsigned long nowMs)
  {
    unsigned long next = applyBackoff(
        deadlineFromLast(g_lastCheckinMs, g_checkinIntervalSeconds, nowMs), g_checkinBackoffUntilMs, nowMs);

    const unsigned long reportDue =
        g_sendTelemetryNow ? nowMs : deadlineFromLast(g_lastReportMs, g_reportIntervalSeconds, nowMs);
    const unsigned long reportWake = applyBackoff(reportDue, g_telemetryBackoffUntilMs, nowMs);
    if (reportWake < next)
    {
      next = reportWake;
    }
    return next;
  }

  unsigned long sleepSeconds(unsigned long nowMs)
  {
    const unsigned long next = nextWakeMs(nowMs);
    if (next <= nowMs)
    {
      return 1;
    }
    return (next - nowMs + 999UL) / 1000UL;
  }

  void sleepForSeconds(unsigned long seconds)
  {
    unsigned long remainingMs = seconds * 1000UL;
    while (remainingMs > 0)
    {
      const unsigned long chunk = remainingMs > kSleepChunkMs ? kSleepChunkMs : remainingMs;
      delay(chunk);
      remainingMs -= chunk;
      maybeWeeklyReboot();
    }
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
  Serial.printf("Default intervals (checkin=%ds report=%ds) until the server responds\n",
                g_checkinIntervalSeconds, g_reportIntervalSeconds);
  Serial.flush();
  g_configLoaded = true;

  initSensorDrivers(g_cfg);

#if UD_WIFI_DEBUG
  logWifiCredentialsDebug();
#endif

  // Do not write Wi-Fi credentials to flash on every (re)connect.
  WiFi.persistent(false);
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
    g_lastNtpAttemptMs = millis();
    if (!syncTime(kNtpBootAttempts))
    {
      Serial.println("NTP failed, will retry");
    }
  }
  else
  {
    Serial.print("WiFi connect failed status=");
    Serial.println(WiFi.status());
  }
}

void loop()
{
  if (!g_configLoaded)
  {
    // Nothing to do without a flashed config; the error was printed in setup().
    delay(1000);
    return;
  }

  maybeWeeklyReboot();

  if (!ensureWifi())
  {
    delay(500);
    return;
  }

  if (!ensureClock())
  {
    delay(1000);
    return;
  }

  const unsigned long wakeMs = millis();

  // Check-in is rate-limited to checkinIntervalSeconds. Telemetry may be due sooner.
  if (shouldCheckin(wakeMs))
  {
    String body;
    String headers;
    int code = 0;

    if (!postCheckin(body, code, headers))
    {
      g_checkinBackoffUntilMs = millis() + kCheckinFailBackoffMs;
    }
    else if (code == 429)
    {
      const int waitSec = parseRetryAfterSeconds(headers);
      Serial.printf("Check-in rate limited, waiting %ds\n", waitSec);
      g_checkinBackoffUntilMs = millis() + static_cast<unsigned long>(waitSec) * 1000UL;
    }
    else if (code < 200 || code >= 300)
    {
      Serial.printf("Check-in HTTP %d: %s\n", code, body.c_str());
      g_checkinBackoffUntilMs = millis() + kCheckinFailBackoffMs;
    }
    else
    {
      g_lastCheckinMs = wakeMs;
      g_checkinBackoffUntilMs = 0;
      parseCommands(body);
      Serial.printf("Check-in OK (checkin=%ds report=%ds)\n", g_checkinIntervalSeconds,
                    g_reportIntervalSeconds);
    }
  }

  // Re-read the clock and intervals after check-in so a shorter report window runs now.
  const unsigned long telemetryMs = millis();
  if (shouldSendTelemetry(telemetryMs))
  {
    const float elapsedSec =
        g_lastReportMs == 0 ? static_cast<float>(g_reportIntervalSeconds)
                            : static_cast<float>(telemetryMs - g_lastReportMs) / 1000.0f;

    String ingestBody;
    String ingestHeaders;
    int ingestCode = 0;
    bool noReadings = false;
    if (!postTelemetry(elapsedSec, ingestBody, ingestCode, ingestHeaders, noReadings))
    {
      if (noReadings)
      {
        Serial.println("Telemetry skipped: no valid sensor readings");
        g_telemetryBackoffUntilMs = millis() + kTelemetryFailBackoffMs;
      }
      else
      {
        g_telemetryBackoffUntilMs = millis() + kCheckinFailBackoffMs;
      }
    }
    else if (ingestCode == 429)
    {
      const int waitSec = parseRetryAfterSeconds(ingestHeaders);
      Serial.printf("Telemetry rate limited, retry in %ds\n", waitSec);
      g_telemetryBackoffUntilMs = millis() + static_cast<unsigned long>(waitSec) * 1000UL;
    }
    else if (ingestCode >= 200 && ingestCode < 300)
    {
      g_lastReportMs = telemetryMs;
      g_telemetryBackoffUntilMs = 0;
      // Fulfilled. Clear first so an unparseable response cannot leave the on-demand flag stuck on.
      g_sendTelemetryNow = false;
      parseCommands(ingestBody);
      Serial.println("Telemetry uploaded");
    }
    else
    {
      Serial.printf("Telemetry HTTP %d: %s\n", ingestCode, ingestBody.c_str());
      g_telemetryBackoffUntilMs = millis() + kTelemetryFailBackoffMs;
    }
  }

  const unsigned long waitSec = sleepSeconds(millis());
  Serial.printf("Next wake in %lus (checkin=%ds report=%ds, %s)\n", waitSec, g_checkinIntervalSeconds,
                g_reportIntervalSeconds, g_intervalsFromServer ? "from server" : "default");
  sleepForSeconds(waitSec);
}
