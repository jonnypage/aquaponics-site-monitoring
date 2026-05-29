#include "aquaponics/app.h"

#include "config.h"

namespace aquaponics {

AquaponicsApp::AquaponicsApp(DeviceConfig &cfg, AppendReadingsFn appendReadings, PostSnapshotFn postSnapshot,
                             LoopHookFn loopHook)
    : g_cfg(cfg), g_appendReadings(appendReadings), g_postSnapshot(postSnapshot), g_loopHook(loopHook) {}

bool AquaponicsApp::parseCommands(const String &body) {
  JsonDocument doc;
  if (deserializeJson(doc, body)) {
    return false;
  }
  JsonObjectConst commands = doc["commands"].as<JsonObjectConst>();
  if (commands.isNull()) {
    return false;
  }
  if (!commands["checkinIntervalSeconds"].isNull()) {
    g_commands.checkinIntervalSeconds = commands["checkinIntervalSeconds"].as<int>();
  }
  if (!commands["reportIntervalSeconds"].isNull()) {
    g_commands.reportIntervalSeconds = commands["reportIntervalSeconds"].as<int>();
  }
  if (!commands["snapshotIntervalSeconds"].isNull()) {
    g_commands.snapshotIntervalSeconds = commands["snapshotIntervalSeconds"].as<int>();
  }
  if (!commands["hasCamera"].isNull()) {
    g_commands.hasCamera = commands["hasCamera"].as<bool>();
    g_cfg.hasCamera = g_commands.hasCamera;
  }
  if (!commands["captureImageNow"].isNull()) {
    g_commands.captureImageNow = g_commands.hasCamera && commands["captureImageNow"].as<bool>();
  } else {
    g_commands.captureImageNow = false;
  }
  if (!commands["sendTelemetryNow"].isNull()) {
    g_commands.sendTelemetryNow = commands["sendTelemetryNow"].as<bool>();
  } else {
    g_commands.sendTelemetryNow = false;
  }
  return true;
}

bool AquaponicsApp::postCheckin(String &responseBody, int &httpCode, String &responseHeaders) {
  JsonDocument body;
  body["deviceId"] = g_cfg.deviceId;
  body["timestamp"] = iso8601Utc();
  String payload;
  serializeJson(body, payload);
  return httpPostJson(g_cfg.apiOrigin, "/checkin", g_cfg.apiKey, payload, responseBody, httpCode, responseHeaders);
}

bool AquaponicsApp::postTelemetry(float elapsedSeconds, String &responseBody, int &httpCode,
                                  String &responseHeaders) {
  JsonDocument body;
  body["deviceId"] = g_cfg.deviceId;
  body["timestamp"] = iso8601Utc();
  JsonObject readings = body["readings"].to<JsonObject>();
  const float elapsed = elapsedSeconds > 0.0f ? elapsedSeconds : static_cast<float>(g_commands.reportIntervalSeconds);
  g_appendReadings(readings, g_cfg, elapsed);

  String payload;
  serializeJson(body, payload);
  return httpPostJson(g_cfg.apiOrigin, "/ingest", g_cfg.apiKey, payload, responseBody, httpCode, responseHeaders);
}

bool AquaponicsApp::shouldSendTelemetry(unsigned long nowMs) const {
  if (g_commands.sendTelemetryNow) {
    return true;
  }
  if (g_lastReportMs == 0) {
    return true;
  }
  const unsigned long intervalMs = static_cast<unsigned long>(g_commands.reportIntervalSeconds) * 1000UL;
  return nowMs - g_lastReportMs >= intervalMs;
}

bool AquaponicsApp::shouldSendSnapshot(unsigned long nowMs) const {
  if (!g_commands.hasCamera || g_postSnapshot == nullptr) {
    return false;
  }
  if (g_commands.captureImageNow) {
    return true;
  }
  if (g_lastSnapshotMs == 0) {
    return true;
  }
  const unsigned long intervalMs = static_cast<unsigned long>(g_commands.snapshotIntervalSeconds) * 1000UL;
  return nowMs - g_lastSnapshotMs >= intervalMs;
}

void AquaponicsApp::loop() {
  if (!ensureWifi(g_cfg.wifiSsid, g_cfg.wifiPassword)) {
    delay(500);
    return;
  }

  if (g_loopHook != nullptr) {
    g_loopHook();
  }

  const unsigned long wakeMs = millis();

  String body;
  String headers;
  int code = 0;

  if (!postCheckin(body, code, headers)) {
    delay(5000);
    return;
  }

  if (code == 429) {
    const int waitSec = parseRetryAfterSeconds(headers);
    Serial.printf("Check-in rate limited, waiting %ds\n", waitSec);
    delay(static_cast<unsigned long>(waitSec) * 1000UL);
    return;
  }

  if (code < 200 || code >= 300) {
    Serial.printf("Check-in HTTP %d: %s\n", code, body.c_str());
    delay(10000);
    return;
  }

  parseCommands(body);
  Serial.printf("Check-in OK (checkin=%ds report=%ds snapshot=%ds)\n", g_commands.checkinIntervalSeconds,
                g_commands.reportIntervalSeconds, g_commands.snapshotIntervalSeconds);

  if (shouldSendTelemetry(wakeMs)) {
    const float elapsedSec =
        g_lastReportMs == 0 ? static_cast<float>(g_commands.reportIntervalSeconds)
                            : static_cast<float>(wakeMs - g_lastReportMs) / 1000.0f;

    String ingestBody;
    String ingestHeaders;
    int ingestCode = 0;
    if (!postTelemetry(elapsedSec, ingestBody, ingestCode, ingestHeaders)) {
      delay(5000);
      return;
    }

    if (ingestCode == 429) {
      delay(static_cast<unsigned long>(parseRetryAfterSeconds(ingestHeaders)) * 1000UL);
      return;
    }

    if (ingestCode >= 200 && ingestCode < 300) {
      g_lastReportMs = wakeMs;
      parseCommands(ingestBody);
      Serial.println("Telemetry uploaded");
    } else {
      Serial.printf("Telemetry HTTP %d: %s\n", ingestCode, ingestBody.c_str());
      delay(10000);
      return;
    }
  }

  if (shouldSendSnapshot(wakeMs)) {
    int snapCode = 0;
    String snapHeaders;
    if (g_postSnapshot != nullptr && g_postSnapshot(snapCode, snapHeaders)) {
      if (snapCode == 429) {
        delay(static_cast<unsigned long>(parseRetryAfterSeconds(snapHeaders)) * 1000UL);
      } else if (snapCode >= 200 && snapCode < 300) {
        g_lastSnapshotMs = wakeMs;
        g_commands.captureImageNow = false;
        Serial.println("Snapshot uploaded");
      } else {
        Serial.printf("Snapshot HTTP %d\n", snapCode);
      }
    }
  }

  delay(static_cast<unsigned long>(g_commands.checkinIntervalSeconds) * 1000UL);
}

}  // namespace aquaponics
