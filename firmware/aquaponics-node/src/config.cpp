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

  if (doc["v"].as<int>() != 1) {
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
      if (out.sensorCount >= sizeof(out.sensors) / sizeof(out.sensors[0])) {
        break;
      }
      const int pin = parsePinValue(kv.value());
      if (pin < 0) {
        continue;
      }
      out.sensors[out.sensorCount].key = kv.key().c_str();
      out.sensors[out.sensorCount].pin = pin;
      out.sensorCount++;
    }
  }

  return out.deviceId.length() > 0 && out.apiKey.length() > 0 && out.apiOrigin.length() > 0 &&
         out.wifiSsid.length() > 0;
}
