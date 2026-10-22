#include "aquaponics/app.h"

#include "config.h"

namespace aquaponics {

namespace {

int intervalOrFallback(int value, int fallback) {
  return value > 0 ? value : fallback;
}

bool intervalElapsed(unsigned long lastMs, int intervalSeconds, unsigned long nowMs) {
  if (lastMs == 0) {
    return true;
  }
  const int intervalSec = intervalOrFallback(intervalSeconds, 1);
  return nowMs - lastMs >= static_cast<unsigned long>(intervalSec) * 1000UL;
}

unsigned long remainingIntervalSeconds(unsigned long lastMs, int intervalSeconds, unsigned long nowMs) {
  const int intervalSec = intervalOrFallback(intervalSeconds, 1);
  if (lastMs == 0) {
    return 0;
  }
  const unsigned long intervalMs = static_cast<unsigned long>(intervalSec) * 1000UL;
  const unsigned long elapsed = nowMs - lastMs;
  if (elapsed >= intervalMs) {
    return 0;
  }
  return (intervalMs - elapsed + 999UL) / 1000UL;
}

}  // namespace

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
    const int value = commands["checkinIntervalSeconds"].as<int>();
    if (value > 0) {
      g_commands.checkinIntervalSeconds = value;
    }
  }
  if (!commands["reportIntervalSeconds"].isNull()) {
    const int value = commands["reportIntervalSeconds"].as<int>();
    if (value > 0) {
      g_commands.reportIntervalSeconds = value;
    }
  }
  if (!commands["snapshotIntervalSeconds"].isNull()) {
    const int value = commands["snapshotIntervalSeconds"].as<int>();
    if (value > 0) {
      g_commands.snapshotIntervalSeconds = value;
    }
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

bool AquaponicsApp::shouldCheckin(unsigned long nowMs) const {
  return intervalElapsed(g_lastCheckinMs, g_commands.checkinIntervalSeconds, nowMs);
}

bool AquaponicsApp::shouldSendTelemetry(unsigned long nowMs) const {
  if (g_commands.sendTelemetryNow) {
    return true;
  }
  return intervalElapsed(g_lastReportMs, g_commands.reportIntervalSeconds, nowMs);
}

bool AquaponicsApp::shouldSendSnapshot(unsigned long nowMs) const {
  if (!g_commands.hasCamera || g_postSnapshot == nullptr) {
    return false;
  }
  if (g_commands.captureImageNow) {
    return true;
  }
  return intervalElapsed(g_lastSnapshotMs, g_commands.snapshotIntervalSeconds, nowMs);
}

unsigned long AquaponicsApp::sleepSeconds(unsigned long nowMs) const {
  unsigned long sleepSec = remainingIntervalSeconds(g_lastCheckinMs, g_commands.checkinIntervalSeconds, nowMs);
  const unsigned long reportSec = remainingIntervalSeconds(g_lastReportMs, g_commands.reportIntervalSeconds, nowMs);
  if (reportSec < sleepSec) {
    sleepSec = reportSec;
  }
  if (g_commands.hasCamera && g_postSnapshot != nullptr) {
    const unsigned long snapSec =
        remainingIntervalSeconds(g_lastSnapshotMs, g_commands.snapshotIntervalSeconds, nowMs);
    if (snapSec < sleepSec) {
      sleepSec = snapSec;
    }
  }
  return sleepSec < 1 ? 1 : sleepSec;
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

  // Check-in is rate-limited to checkinIntervalSeconds. Telemetry/snapshots may be due sooner.
  if (shouldCheckin(wakeMs)) {
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

    g_lastCheckinMs = wakeMs;
    parseCommands(body);
    Serial.printf("Check-in OK (checkin=%ds report=%ds snapshot=%ds)\n", g_commands.checkinIntervalSeconds,
                  g_commands.reportIntervalSeconds, g_commands.snapshotIntervalSeconds);
  }

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

  const unsigned long waitSec = sleepSeconds(millis());
  Serial.printf("Next wake in %lus (checkin=%ds report=%ds snapshot=%ds)\n", waitSec,
                g_commands.checkinIntervalSeconds, g_commands.reportIntervalSeconds,
                g_commands.snapshotIntervalSeconds);
  delay(waitSec * 1000UL);
}

}  // namespace aquaponics
