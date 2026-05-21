import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { GqlAuthGuard } from "../auth/gql-auth.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { AdminService } from "./admin.service.js";
import {
  AdminDeviceModel,
  AdminSiteModel,
  AdminUserModel,
  CreateAdminDeviceInput,
  CreateAdminDevicePayload,
  CreateAdminSiteInput,
  CreateAdminUserInput,
  CreateSensorCatalogEntryInput,
  RotateAdminDeviceApiKeyPayload,
  SensorCatalogEntryModel,
  UpdateAdminDeviceInput,
  UpdateAdminSiteInput,
  UpdateAdminUserInput,
  UpdateSensorCatalogEntryInput
} from "./admin.types.js";

@Resolver()
export class AdminResolver {
  constructor(private readonly admin: AdminService) {}

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Query(() => [SensorCatalogEntryModel])
  async sensorCatalog(): Promise<SensorCatalogEntryModel[]> {
    return this.admin.sensorCatalog();
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Query(() => [AdminUserModel])
  async adminUsers(): Promise<AdminUserModel[]> {
    return this.admin.adminUsers();
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Query(() => [AdminSiteModel])
  async adminSites(): Promise<AdminSiteModel[]> {
    return this.admin.adminSites();
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Query(() => [AdminDeviceModel])
  async adminDevices(@Args("siteId", { nullable: true, type: () => String }) siteId?: string | null): Promise<
    AdminDeviceModel[]
  > {
    return this.admin.adminDevices(siteId ?? undefined);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Query(() => AdminDeviceModel)
  async adminDevice(@Args("id") id: string): Promise<AdminDeviceModel> {
    return this.admin.adminDevice(id);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => SensorCatalogEntryModel)
  async createSensorCatalogEntry(
    @Args("input", { type: () => CreateSensorCatalogEntryInput }) input: CreateSensorCatalogEntryInput
  ): Promise<SensorCatalogEntryModel> {
    return this.admin.createSensorCatalogEntry(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => SensorCatalogEntryModel)
  async updateSensorCatalogEntry(
    @Args("input", { type: () => UpdateSensorCatalogEntryInput }) input: UpdateSensorCatalogEntryInput
  ): Promise<SensorCatalogEntryModel> {
    return this.admin.updateSensorCatalogEntry(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => Boolean)
  async deleteSensorCatalogEntry(@Args("key") key: string): Promise<boolean> {
    return this.admin.deleteSensorCatalogEntry(key);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => AdminUserModel)
  async createAdminUser(@Args("input", { type: () => CreateAdminUserInput }) input: CreateAdminUserInput): Promise<AdminUserModel> {
    return this.admin.createAdminUser(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => AdminUserModel)
  async updateAdminUser(@Args("input", { type: () => UpdateAdminUserInput }) input: UpdateAdminUserInput): Promise<AdminUserModel> {
    return this.admin.updateAdminUser(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => Boolean)
  async resetAdminUserPassword(
    @Args("id") id: string,
    @Args("newPassword") newPassword: string
  ): Promise<boolean> {
    return this.admin.resetAdminUserPassword(id, newPassword);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => AdminSiteModel)
  async createAdminSite(@Args("input", { type: () => CreateAdminSiteInput }) input: CreateAdminSiteInput): Promise<AdminSiteModel> {
    return this.admin.createAdminSite(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => AdminSiteModel)
  async updateAdminSite(@Args("input", { type: () => UpdateAdminSiteInput }) input: UpdateAdminSiteInput): Promise<AdminSiteModel> {
    return this.admin.updateAdminSite(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => CreateAdminDevicePayload)
  async createAdminDevice(
    @Args("input", { type: () => CreateAdminDeviceInput }) input: CreateAdminDeviceInput
  ): Promise<{ device: AdminDeviceModel; plainApiKey: string }> {
    return this.admin.createAdminDevice(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => AdminDeviceModel)
  async updateAdminDevice(
    @Args("input", { type: () => UpdateAdminDeviceInput }) input: UpdateAdminDeviceInput
  ): Promise<AdminDeviceModel> {
    return this.admin.updateAdminDevice(input);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => RotateAdminDeviceApiKeyPayload)
  async rotateAdminDeviceApiKey(@Args("deviceId") deviceId: string): Promise<{ plainApiKey: string }> {
    return this.admin.rotateAdminDeviceApiKey(deviceId);
  }

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Mutation(() => Boolean)
  async deleteAdminDevice(@Args("deviceId") deviceId: string): Promise<boolean> {
    return this.admin.deleteAdminDevice(deviceId);
  }
}
