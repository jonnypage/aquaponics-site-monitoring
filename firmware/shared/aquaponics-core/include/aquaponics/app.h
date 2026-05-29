#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

#include "config.h"
#include "aquaponics/net.h"

namespace aquaponics {

struct DeviceCommands {
  int checkinIntervalSeconds = 300;
  int reportIntervalSeconds = 1800;
  int snapshotIntervalSeconds = 3600;
  bool hasCamera = false;
  bool captureImageNow = false;
  bool sendTelemetryNow = false;
};

using AppendReadingsFn = void (*)(JsonObject readings, const DeviceConfig &cfg, float elapsedSeconds);
using PostSnapshotFn = bool (*)(int &httpCode, String &responseHeaders);
using LoopHookFn = void (*)();

class AquaponicsApp {
 public:
  AquaponicsApp(
      DeviceConfig &cfg,
      AppendReadingsFn appendReadings,
      PostSnapshotFn postSnapshot = nullptr,
      LoopHookFn loopHook = nullptr);

  void loop();

  DeviceCommands commands() const { return g_commands; }

 private:
  DeviceConfig &g_cfg;
  AppendReadingsFn g_appendReadings;
  PostSnapshotFn g_postSnapshot;
  LoopHookFn g_loopHook;

  DeviceCommands g_commands;
  unsigned long g_lastReportMs = 0;
  unsigned long g_lastSnapshotMs = 0;

  bool parseCommands(const String &body);
  bool postCheckin(String &responseBody, int &httpCode, String &responseHeaders);
  bool postTelemetry(float elapsedSeconds, String &responseBody, int &httpCode, String &responseHeaders);
  bool shouldSendTelemetry(unsigned long nowMs) const;
  bool shouldSendSnapshot(unsigned long nowMs) const;
};

}  // namespace aquaponics
