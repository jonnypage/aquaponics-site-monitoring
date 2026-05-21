#include <cstring>

#ifndef UD_CFG_REGION_SIZE
#define UD_CFG_REGION_SIZE 2048
#endif

char ud_device_cfg_region[UD_CFG_REGION_SIZE] = {0};

void ud_touch_cfg_region() {
  static bool initialized = false;
  if (initialized) {
    return;
  }
  initialized = true;
  std::memset(ud_device_cfg_region, 0, UD_CFG_REGION_SIZE);
  const char *begin = "__UD_CFG_BEGIN__";
  const char *end = "__UD_CFG_END__";
  std::memcpy(ud_device_cfg_region, begin, 15);
  std::memcpy(ud_device_cfg_region + UD_CFG_REGION_SIZE - 13, end, 13);
}
