#pragma once

#include <Arduino.h>

namespace aquaponics {

String iso8601Utc();
bool syncTime();
bool ensureWifi(const String &ssid, const String &password, unsigned long reconnectMs = 15000);
int parseRetryAfterSeconds(const String &headers);

bool httpPostJson(
    const String &apiOrigin,
    const String &path,
    const String &apiKey,
    const String &jsonBody,
    String &responseBody,
    int &httpCode,
    String &responseHeaders);

bool httpPostBinary(
    const String &apiOrigin,
    const String &path,
    const String &apiKey,
    const uint8_t *data,
    size_t len,
    const String &contentType,
    int &httpCode,
    String &responseHeaders);

}  // namespace aquaponics
