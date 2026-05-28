import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { SnapshotsService } from "../snapshots/snapshots.service.js";
import { DeviceSnapshotModel } from "../snapshots/snapshots.types.js";
import { AdminDeviceModel } from "./admin.types.js";

@Resolver(() => AdminDeviceModel)
export class AdminDeviceResolver {
  constructor(private readonly snapshots: SnapshotsService) {}

  @ResolveField(() => [DeviceSnapshotModel])
  async recentSnapshots(@Parent() device: AdminDeviceModel): Promise<DeviceSnapshotModel[]> {
    return this.snapshots.getRecentForDevice(device.deviceId);
  }
}
