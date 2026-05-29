#pragma once

#include <ArduinoJson.h>

#include "config.h"

/** Attach flow-meter ISRs after config load. */
void initSensorDrivers(const DeviceConfig &cfg);

/** Read configured sensors into readings (omits failed/disabled). */
void appendSensorReadings(JsonObject readings, const DeviceConfig &cfg, float reportIntervalSeconds);
