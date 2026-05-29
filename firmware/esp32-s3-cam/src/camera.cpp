#include "camera.h"

#include <Arduino.h>
#include <cstring>

#include <esp_camera.h>

namespace {

bool g_cameraReady = false;

/** OV3660 DVP — Espressif CAMERA_MODEL_ESP32S3_EYE (AliExpress ESP32-S3 CAM). */
camera_config_t buildCameraConfig() {
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = 11;   // Y2
  config.pin_d1 = 9;    // Y3
  config.pin_d2 = 8;    // Y4
  config.pin_d3 = 10;   // Y5
  config.pin_d4 = 12;   // Y6
  config.pin_d5 = 18;   // Y7
  config.pin_d6 = 17;   // Y8
  config.pin_d7 = 16;   // Y9
  config.pin_xclk = 15;
  config.pin_pclk = 13;
  config.pin_vsync = 6;
  config.pin_href = 7;
  config.pin_sccb_sda = 4;
  config.pin_sccb_scl = 5;
  config.pin_pwdn = -1;
  config.pin_reset = -1;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_DRAM;

  if (psramFound()) {
    config.jpeg_quality = 12;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
    config.fb_location = CAMERA_FB_IN_PSRAM;
  }

  return config;
}

}  // namespace

bool initDeviceCamera(bool enabled) {
  g_cameraReady = false;
  if (!enabled) {
    return true;
  }

  const camera_config_t config = buildCameraConfig();
  const esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x (needs PSRAM + OV3660 CAM pinout)\n", err);
    return false;
  }

  sensor_t *sensor = esp_camera_sensor_get();
  if (sensor != nullptr) {
    if (sensor->id.PID == OV3660_PID) {
      sensor->set_vflip(sensor, 1);
      sensor->set_hmirror(sensor, 1);
    }
  }

  g_cameraReady = true;
  Serial.println("Camera ready (OV3660)");
  return true;
}

bool captureCameraJpeg(uint8_t **outBuf, size_t *outLen) {
  *outBuf = nullptr;
  *outLen = 0;
  if (!g_cameraReady) {
    return false;
  }

  camera_fb_t *fb = esp_camera_fb_get();
  if (fb == nullptr || fb->len == 0) {
    Serial.println("Snapshot: camera capture failed");
    if (fb != nullptr) {
      esp_camera_fb_return(fb);
    }
    return false;
  }

  if (fb->format != PIXFORMAT_JPEG) {
    Serial.println("Snapshot: frame is not JPEG");
    esp_camera_fb_return(fb);
    return false;
  }

  uint8_t *copy = static_cast<uint8_t *>(malloc(fb->len));
  if (copy == nullptr) {
    Serial.println("Snapshot: out of memory");
    esp_camera_fb_return(fb);
    return false;
  }
  memcpy(copy, fb->buf, fb->len);
  *outBuf = copy;
  *outLen = fb->len;
  esp_camera_fb_return(fb);

  Serial.printf("Snapshot: captured %u bytes\n", static_cast<unsigned>(*outLen));
  return true;
}
