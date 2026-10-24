#include "sensors.h"

#include <math.h>

#include <DallasTemperature.h>
#include <OneWire.h>

namespace {

constexpr float kPhVoltageAtPh7 = 2.5f;
constexpr float kPhVoltsPerPh = 0.18f;
constexpr float kYfs201PulsesPerLiter = 450.0f;
constexpr float kAdcFullScaleVolts = 3.3f;
constexpr int kAdcMaxCount = 1023;

constexpr uint8_t kMaxFlowMeters = 8;

volatile uint32_t g_flowPulses[kMaxFlowMeters] = {0};
uint8_t g_flowSensorIndex[kMaxFlowMeters] = {0};
uint8_t g_flowMeterCount = 0;

void IRAM_ATTR flowIsr0() { g_flowPulses[0]++; }
void IRAM_ATTR flowIsr1() { g_flowPulses[1]++; }
void IRAM_ATTR flowIsr2() { g_flowPulses[2]++; }
void IRAM_ATTR flowIsr3() { g_flowPulses[3]++; }
void IRAM_ATTR flowIsr4() { g_flowPulses[4]++; }
void IRAM_ATTR flowIsr5() { g_flowPulses[5]++; }
void IRAM_ATTR flowIsr6() { g_flowPulses[6]++; }
void IRAM_ATTR flowIsr7() { g_flowPulses[7]++; }

using FlowIsrFn = void (*)();
const FlowIsrFn kFlowIsrs[kMaxFlowMeters] = {
    flowIsr0, flowIsr1, flowIsr2, flowIsr3, flowIsr4, flowIsr5, flowIsr6, flowIsr7,
};

static float round3(float v) {
  return roundf(v * 1000.0f) / 1000.0f;
}

/** WeMos D1 mini labels the only ADC header as A0; the install wizard stores it as GPIO 17. */
static bool isAdcPin(int pin) {
  return pin == static_cast<int>(A0);
}

static bool readTemperatureC(int pin, float &outC) {
  if (isAdcPin(pin)) {
    Serial.printf("Sensor temp GPIO%d: OneWire is not available on A0\n", pin);
    return false;
  }
  OneWire ow(static_cast<uint8_t>(pin));
  DallasTemperature dt(&ow);
  dt.begin();
  dt.requestTemperatures();
  delay(800);
  const float c = dt.getTempCByIndex(0);
  if (c == DEVICE_DISCONNECTED_C || c == DEVICE_DISCONNECTED_RAW || c < -55.0f || c > 125.0f) {
    Serial.printf("Sensor temp GPIO%d: read failed\n", pin);
    return false;
  }
  outC = c;
  return true;
}

static bool readPh(int pin, float &outPh) {
  if (!isAdcPin(pin)) {
    Serial.printf("Sensor ph GPIO%d: ADC only on A0 (GPIO17)\n", pin);
    return false;
  }
  const int raw = analogRead(A0);
  if (raw < 0) {
    Serial.printf("Sensor ph GPIO%d: ADC failed\n", pin);
    return false;
  }
  const float volts = (static_cast<float>(raw) / static_cast<float>(kAdcMaxCount)) * kAdcFullScaleVolts;
  outPh = 7.0f + (kPhVoltageAtPh7 - volts) / kPhVoltsPerPh;
  if (outPh < 0.0f || outPh > 14.0f) {
    Serial.printf("Sensor ph GPIO%d: out of range %.2f\n", pin, outPh);
    return false;
  }
  return true;
}

static bool readFloatSwitch(int pin, float &outLevelPct) {
  if (isAdcPin(pin)) {
    Serial.printf("Sensor waterLevel GPIO%d: digital read is not available on A0\n", pin);
    return false;
  }
  if (pin == 16) {
    Serial.println("Sensor waterLevel GPIO16: no internal pull-up; add an external pull-up");
  }
  pinMode(static_cast<uint8_t>(pin), INPUT_PULLUP);
  const int level = digitalRead(static_cast<uint8_t>(pin));
  outLevelPct = level == LOW ? 100.0f : 0.0f;
  return true;
}

static int flowMeterIndexForSensor(uint8_t sensorIndex) {
  for (uint8_t i = 0; i < g_flowMeterCount; ++i) {
    if (g_flowSensorIndex[i] == sensorIndex) {
      return static_cast<int>(i);
    }
  }
  return -1;
}

static bool readWaterFlow(uint8_t sensorIndex, float elapsedSeconds, float &outLpm) {
  const int meterIdx = flowMeterIndexForSensor(sensorIndex);
  if (meterIdx < 0) {
    return false;
  }
  noInterrupts();
  const uint32_t pulses = g_flowPulses[meterIdx];
  g_flowPulses[meterIdx] = 0;
  interrupts();

  const float intervalSec = elapsedSeconds > 0.0f ? elapsedSeconds : 300.0f;
  const float liters = static_cast<float>(pulses) / kYfs201PulsesPerLiter;
  outLpm = liters / (intervalSec / 60.0f);
  return true;
}

}  // namespace

void initSensorDrivers(const DeviceConfig &cfg) {
  g_flowMeterCount = 0;
  for (uint8_t i = 0; i < kMaxFlowMeters; ++i) {
    g_flowPulses[i] = 0;
  }

  for (uint8_t i = 0; i < cfg.sensorCount; ++i) {
    if (cfg.sensors[i].sensorType != "waterFlow") {
      continue;
    }
    if (g_flowMeterCount >= kMaxFlowMeters) {
      Serial.println("Sensor flow: too many flow meters (max 8)");
      break;
    }
    const int pin = cfg.sensors[i].pin;
    if (pin < 0) {
      continue;
    }
    if (isAdcPin(pin)) {
      Serial.printf("Sensor flow: GPIO%d is A0 and has no pulse interrupt\n", pin);
      continue;
    }
    const int irq = digitalPinToInterrupt(static_cast<uint8_t>(pin));
    if (irq == NOT_AN_INTERRUPT) {
      Serial.printf("Sensor flow: GPIO%d does not support interrupts\n", pin);
      continue;
    }
    pinMode(static_cast<uint8_t>(pin), INPUT_PULLUP);
    g_flowSensorIndex[g_flowMeterCount] = i;
    attachInterrupt(irq, kFlowIsrs[g_flowMeterCount], RISING);
    g_flowMeterCount++;
    Serial.printf("Sensor flow: ISR on GPIO%d (sensor idx %u)\n", pin, i);
  }
}

void appendSensorReadings(JsonObject readings, const DeviceConfig &cfg, float elapsedSeconds) {
  for (uint8_t i = 0; i < cfg.sensorCount; ++i) {
    const SensorPinEntry &s = cfg.sensors[i];
    if (s.pin < 0 || s.sensorType.length() == 0) {
      continue;
    }

    float value = 0.0f;
    bool ok = false;

    if (s.sensorType == "temperature") {
      ok = readTemperatureC(s.pin, value);
    } else if (s.sensorType == "ph") {
      ok = readPh(s.pin, value);
    } else if (s.sensorType == "waterLevel") {
      ok = readFloatSwitch(s.pin, value);
    } else if (s.sensorType == "waterFlow") {
      ok = readWaterFlow(i, elapsedSeconds, value);
    } else {
      Serial.printf("Sensor %s: unknown type %s\n", s.key.c_str(), s.sensorType.c_str());
      continue;
    }

    if (ok) {
      readings[s.key] = round3(value);
      Serial.printf("Sensor %s (%s): %.3f\n", s.key.c_str(), s.sensorType.c_str(), value);
    }
  }
}
