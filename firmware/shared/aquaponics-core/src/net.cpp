#include "aquaponics/net.h"

#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

namespace aquaponics {

namespace {

unsigned long g_lastWifiAttemptMs = 0;

}  // namespace

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

bool ensureWifi(const String &ssid, const String &password, unsigned long reconnectMs) {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }
  const unsigned long now = millis();
  if (now - g_lastWifiAttemptMs < reconnectMs) {
    return false;
  }
  g_lastWifiAttemptMs = now;
  WiFi.disconnect();
  WiFi.begin(ssid.c_str(), password.c_str());
  return false;
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

static bool beginHttp(HTTPClient &http, const String &apiOrigin, const String &path, WiFiClient &plain,
                      WiFiClientSecure &secure) {
  const String url = apiOrigin + path;
  if (apiOrigin.startsWith("https://")) {
    secure.setInsecure();
    return http.begin(secure, url);
  }
  return http.begin(plain, url);
}

bool httpPostJson(const String &apiOrigin, const String &path, const String &apiKey, const String &jsonBody,
                  String &responseBody, int &httpCode, String &responseHeaders) {
  WiFiClient plain;
  WiFiClientSecure secure;
  HTTPClient http;
  if (!beginHttp(http, apiOrigin, path, plain, secure)) {
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);
  httpCode = http.POST(jsonBody);
  responseBody = http.getString();
  responseHeaders =
      http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
  http.end();
  return httpCode > 0;
}

bool httpPostBinary(const String &apiOrigin, const String &path, const String &apiKey, const uint8_t *data,
                    size_t len, const String &contentType, int &httpCode, String &responseHeaders) {
  WiFiClient plain;
  WiFiClientSecure secure;
  HTTPClient http;
  if (!beginHttp(http, apiOrigin, path, plain, secure)) {
    return false;
  }
  http.addHeader("Content-Type", contentType);
  http.addHeader("x-api-key", apiKey);
  httpCode = http.POST(const_cast<uint8_t *>(data), len);
  responseHeaders =
      http.header("Retry-After").length() ? String("Retry-After: ") + http.header("Retry-After") : "";
  http.end();
  return httpCode > 0;
}

}  // namespace aquaponics
