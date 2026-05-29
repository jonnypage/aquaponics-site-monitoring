#pragma once

#include <Arduino.h>

struct SensorPinEntry {
  String key;
  String sensorType;
  String role;
  int pin;
};

struct DeviceConfig {
  String deviceId;
  String apiKey;
  String apiOrigin;
  String wifiSsid;
  String wifiPassword;
  bool hasCamera = false;
  SensorPinEntry sensors[24];
  uint8_t sensorCount = 0;
};

bool loadDeviceConfig(DeviceConfig &out);
