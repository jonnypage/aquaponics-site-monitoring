#include "config.h"

#include <ArduinoJson.h>

extern char ud_device_cfg_region[2048];
void ud_touch_cfg_region();

static const char *CFG_BEGIN = "__UD_CFG_BEGIN__";
static const char *CFG_END = "__UD_CFG_END__";

#ifndef UD_CFG_REGION_SIZE
#define UD_CFG_REGION_SIZE 2048
#endif

namespace {
constexpr size_t kBeginLen = 16;
constexpr size_t kEndLen = 14;
constexpr size_t kPayloadStart = kBeginLen;
constexpr size_t kPayloadEnd = UD_CFG_REGION_SIZE - kEndLen;
}  // namespace

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
  out.sensors[out.sensorCount].sensorType = "";
  out.sensors[out.sensorCount].role = role;
  out.sensors[out.sensorCount].pin = pin;
  out.sensorCount++;
  return true;
}

static String inferSensorTypeFromKey(const char *sensorKey) {
  if (strcmp(sensorKey, "temperature") == 0 || strcmp(sensorKey, "ds18b20") == 0) {
    return String("temperature");
  }
  if (strcmp(sensorKey, "ph") == 0 || strcmp(sensorKey, "bncPhModule") == 0) {
    return String("ph");
  }
  if (strcmp(sensorKey, "waterLevel") == 0 || strcmp(sensorKey, "floatSwitch") == 0) {
    return String("waterLevel");
  }
  if (strcmp(sensorKey, "waterFlow") == 0 || strcmp(sensorKey, "yfs201") == 0) {
    return String("waterFlow");
  }
  return String("");
}

static void applySensorTypes(DeviceConfig &out, JsonObjectConst sensorTypes) {
  for (uint8_t i = 0; i < out.sensorCount; ++i) {
    const char *key = out.sensors[i].key.c_str();
    if (!sensorTypes.isNull()) {
      JsonVariantConst typed = sensorTypes[key];
      if (!typed.isNull() && typed.is<const char *>()) {
        out.sensors[i].sensorType = typed.as<const char *>();
        continue;
      }
    }
    out.sensors[i].sensorType = inferSensorTypeFromKey(key);
  }
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
  // Do not use strstr on the 2 KiB slot: payload is zero-padded and not null-terminated.
  if (memcmp(region, CFG_BEGIN, kBeginLen) != 0 ||
      memcmp(region + kPayloadEnd, CFG_END, kEndLen) != 0) {
    Serial.println("Config: markers missing (re-flash from Install wizard)");
    return false;
  }

  const char *jsonStart = region + kPayloadStart;
  const char *jsonEnd = region + kPayloadEnd;

  String payload;
  payload.reserve(static_cast<unsigned>(jsonEnd - jsonStart));
  for (const char *p = jsonStart; p < jsonEnd; ++p) {
    if (*p == '\0') {
      continue;
    }
    payload += *p;
  }

  if (payload.length() == 0) {
    Serial.println("Config: empty JSON (re-flash from Install wizard)");
    return false;
  }

  JsonDocument doc;
  const DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.print("Config: JSON parse failed: ");
    Serial.println(err.c_str());
    return false;
  }

  const int version = doc["v"].as<int>();
  if (version != 1 && version != 2 && version != 3) {
    Serial.print("Config: unsupported version ");
    Serial.println(version);
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

  JsonObjectConst sensorTypes = doc["sensorTypes"].as<JsonObjectConst>();
  applySensorTypes(out, sensorTypes);

  if (out.deviceId.length() == 0 || out.apiKey.length() == 0 || out.apiOrigin.length() == 0 ||
      out.wifiSsid.length() == 0) {
    Serial.println("Config: missing deviceId, apiKey, apiOrigin, or wifiSsid");
    return false;
  }

  return true;
}
