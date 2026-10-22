#pragma once

#include <ArduinoJson.h>

#include "config.h"

/** Attach flow-meter ISRs after config load. */
void initSensorDrivers(const DeviceConfig &cfg);

/** Read configured sensors into readings (omits failed/disabled). elapsedSeconds is actual time since last report. */
void appendSensorReadings(JsonObject readings, const DeviceConfig &cfg, float elapsedSeconds);
