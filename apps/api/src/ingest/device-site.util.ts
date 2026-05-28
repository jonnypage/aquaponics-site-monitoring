import { BadRequestException } from "@nestjs/common";

type DeviceRow = { device_id: string; site_id: string | null };

export function requireDeviceSiteId(device: DeviceRow): string {
  if (device.site_id == null || device.site_id === "") {
    throw new BadRequestException("Device is not assigned to a site");
  }
  return device.site_id;
}
