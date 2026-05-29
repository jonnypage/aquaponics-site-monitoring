#pragma once

#include <stddef.h>
#include <stdint.h>

/** Init OV3660 on common ESP32-S3 CAM DVP wiring. No-op when disabled. */
bool initDeviceCamera(bool enabled);

/** Capture one JPEG frame into heap buffer (caller must free). */
bool captureCameraJpeg(uint8_t **outBuf, size_t *outLen);
