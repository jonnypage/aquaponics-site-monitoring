#include "config.h"

#include <ArduinoJson.h>

extern char ud_device_cfg_region[2048];
void ud_touch_cfg_region();

static const char *CFG_BEGIN = "__UD_CFG_BEGIN__";
static const char *CFG_END = "__UD_CFG_END__";

static int parsePinValue(JsonVariantConst v) {
  if (v.isNull()) {
    return -1;
  }
  if (!v.is<int>()) {
    return -1;
  }
  const int pin = v.as<int>();
  return pin >= 0 ? pin : -1;
}

static bool addSensorPin(DeviceConfig &out, const char *sensorKey, const char *role, int pin) {
  if (pin < 0 || out.sensorCount >= sizeof(out.sensors) / sizeof(out.sensors[0])) {
    return false;
  }
  out.sensors[out.sensorCount].key = sensorKey;
  out.sensors[out.sensorCount].role = role;
  out.sensors[out.sensorCount].pin = pin;
  out.sensorCount++;
  return true;
}

static void loadSensorFromPins(DeviceConfig &out, const char *sensorKey, JsonVariantConst value) {
  if (value.isNull()) {
    return;
  }
  if (value.is<int>()) {
    const int pin = parsePinValue(value);
    if (pin >= 0) {
      addSensorPin(out, sensorKey, "signal", pin);
    }
    return;
  }
  JsonObjectConst roles = value.as<JsonObjectConst>();
  if (roles.isNull()) {
    return;
  }
  int signalPin = -1;
  int firstPin = -1;
  const char *firstRole = "signal";
  for (JsonPairConst role : roles) {
    const int pin = parsePinValue(role.value());
    if (pin < 0) {
      continue;
    }
    if (strcmp(role.key().c_str(), "signal") == 0) {
      signalPin = pin;
    }
    if (firstPin < 0) {
      firstPin = pin;
      firstRole = role.key().c_str();
    }
  }
  if (signalPin >= 0) {
    addSensorPin(out, sensorKey, "signal", signalPin);
  } else if (firstPin >= 0) {
    addSensorPin(out, sensorKey, firstRole, firstPin);
  }
}

bool loadDeviceConfig(DeviceConfig &out) {
  ud_touch_cfg_region();

  const char *region = ud_device_cfg_region;
  const char *jsonStart = strstr(region, CFG_BEGIN);
  if (!jsonStart) {
    return false;
  }
  jsonStart += strlen(CFG_BEGIN);

  const char *jsonEnd = strstr(region, CFG_END);
  if (!jsonEnd || jsonEnd <= jsonStart) {
    return false;
  }

  String payload;
  payload.reserve(static_cast<unsigned>(jsonEnd - jsonStart));
  for (const char *p = jsonStart; p < jsonEnd; ++p) {
    if (*p == '\0') {
      continue;
    }
    payload += *p;
  }

  JsonDocument doc;
  const DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    return false;
  }

  const int version = doc["v"].as<int>();
  if (version != 1 && version != 2) {
    return false;
  }

  out.deviceId = doc["deviceId"].as<const char *>();
  out.apiKey = doc["apiKey"].as<const char *>();
  out.apiOrigin = doc["apiOrigin"].as<const char *>();
  out.wifiSsid = doc["wifiSsid"].as<const char *>();
  out.wifiPassword = doc["wifiPassword"].as<const char *>();
  out.hasCamera = doc["hasCamera"].as<bool>();
  out.sensorCount = 0;

  JsonObjectConst pins = doc["pins"].as<JsonObjectConst>();
  if (!pins.isNull()) {
    for (JsonPairConst kv : pins) {
      loadSensorFromPins(out, kv.key().c_str(), kv.value());
    }
  }

  return out.deviceId.length() > 0 && out.apiKey.length() > 0 && out.apiOrigin.length() > 0 &&
         out.wifiSsid.length() > 0;
}
