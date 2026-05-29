#include <cstring>

#ifndef UD_CFG_REGION_SIZE
#define UD_CFG_REGION_SIZE 2048
#endif

extern char ud_device_cfg_region[UD_CFG_REGION_SIZE];

namespace {
constexpr size_t kBeginLen = 16;
constexpr size_t kEndLen = 14;
constexpr size_t kEndOffset = UD_CFG_REGION_SIZE - kEndLen;
}  // namespace

void ud_touch_cfg_region() {
  if (std::memcmp(ud_device_cfg_region, "__UD_CFG_BEGIN__", kBeginLen) != 0) {
    std::memcpy(ud_device_cfg_region, "__UD_CFG_BEGIN__", kBeginLen);
    std::memcpy(ud_device_cfg_region + kEndOffset, "__UD_CFG_END__", kEndLen);
  }
}
