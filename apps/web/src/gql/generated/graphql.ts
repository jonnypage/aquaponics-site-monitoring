/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

export type AdminDeviceModel = {
  __typename?: 'AdminDeviceModel';
  board?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deviceId: Scalars['String']['output'];
  expectedIntervalSeconds: Scalars['Int']['output'];
  hasCamera: Scalars['Boolean']['output'];
  lastSeenAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  pinMap?: Maybe<Scalars['JSON']['output']>;
  recentSnapshots: Array<DeviceSnapshotModel>;
  reportIntervalSeconds: Scalars['Int']['output'];
  sensorReadings: Array<AdminDeviceSensorReadingModel>;
  siteId?: Maybe<Scalars['String']['output']>;
  snapshotIntervalSeconds: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type AdminDeviceSensorReadingModel = {
  __typename?: 'AdminDeviceSensorReadingModel';
  displayName: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  sensorKey: Scalars['String']['output'];
  sensorType: SensorType;
  takenAt?: Maybe<Scalars['DateTime']['output']>;
  unit: Scalars['String']['output'];
  value?: Maybe<Scalars['Float']['output']>;
};

export type AdminSiteModel = {
  __typename?: 'AdminSiteModel';
  deviceSnapshotSettings: Array<SiteDeviceSnapshotSettingsModel>;
  id: Scalars['String']['output'];
  latitude?: Maybe<Scalars['Float']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  sensorReporting: Array<SiteSensorReportingModel>;
  sensorThresholds: Array<SiteSensorThresholdModel>;
};

export type AdminUserModel = {
  __typename?: 'AdminUserModel';
  assignedSiteIds: Array<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  role: Role;
  updatedAt: Scalars['DateTime']['output'];
};

export type AlertModel = {
  __typename?: 'AlertModel';
  createdAt: Scalars['DateTime']['output'];
  deviceId?: Maybe<Scalars['String']['output']>;
  deviceName?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  lastNotifiedAt?: Maybe<Scalars['DateTime']['output']>;
  message: Scalars['String']['output'];
  severity: AlertSeverity;
  siteId: Scalars['String']['output'];
  status: AlertStatus;
  type: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export enum AlertSeverity {
  Critical = 'CRITICAL',
  Warning = 'WARNING'
}

export enum AlertStatus {
  Active = 'ACTIVE',
  Resolved = 'RESOLVED'
}

export type AuthPayload = {
  __typename?: 'AuthPayload';
  ok: Scalars['Boolean']['output'];
  user: UserModel;
};

export type ClearAdminSiteSnapshotsPayload = {
  __typename?: 'ClearAdminSiteSnapshotsPayload';
  deletedSnapshots: Scalars['Int']['output'];
  deletedStorageObjects: Scalars['Int']['output'];
  siteId: Scalars['String']['output'];
  storageSkipped: Scalars['Boolean']['output'];
};

export type CreateAdminDeviceInput = {
  expectedIntervalSeconds?: InputMaybe<Scalars['Int']['input']>;
  hasCamera?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  reportIntervalSeconds?: InputMaybe<Scalars['Int']['input']>;
  siteId?: InputMaybe<Scalars['String']['input']>;
  snapshotIntervalSeconds?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateAdminDevicePayload = {
  __typename?: 'CreateAdminDevicePayload';
  device: AdminDeviceModel;
  plainApiKey: Scalars['String']['output'];
};

export type CreateAdminSiteInput = {
  attachDeviceId?: InputMaybe<Scalars['String']['input']>;
  deviceSnapshotSettings?: InputMaybe<Array<SiteDeviceSnapshotSettingsInput>>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  sensorReporting?: InputMaybe<Array<SiteSensorReportingInput>>;
  sensorThresholds?: InputMaybe<Array<SiteSensorThresholdInput>>;
};

export type CreateAdminUserInput = {
  assignedSiteIds: Array<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  role: Role;
};

export type CreateSensorCatalogEntryInput = {
  displayName: Scalars['String']['input'];
  icon?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  model: Scalars['String']['input'];
  physicalMax?: InputMaybe<Scalars['Float']['input']>;
  physicalMin?: InputMaybe<Scalars['Float']['input']>;
  sensorType: SensorType;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  unit: Scalars['String']['input'];
  wiringTemplate?: InputMaybe<SensorWiringTemplateInput>;
};

export type DeviceSnapshotModel = {
  __typename?: 'DeviceSnapshotModel';
  byteSize: Scalars['Int']['output'];
  contentType: Scalars['String']['output'];
  deviceId: Scalars['String']['output'];
  deviceName?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  imageUrl: Scalars['String']['output'];
  ingestedAt: Scalars['DateTime']['output'];
  siteId: Scalars['String']['output'];
  takenAt: Scalars['DateTime']['output'];
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type MeasurementModel = {
  __typename?: 'MeasurementModel';
  id: Scalars['String']['output'];
  sensor: Scalars['String']['output'];
  takenAt: Scalars['DateTime']['output'];
  value: Scalars['Float']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  clearAdminSiteSnapshots: ClearAdminSiteSnapshotsPayload;
  createAdminDevice: CreateAdminDevicePayload;
  createAdminSite: AdminSiteModel;
  createAdminUser: AdminUserModel;
  createSensorCatalogEntry: SensorCatalogEntryModel;
  deleteAdminDevice: Scalars['Boolean']['output'];
  deleteAdminSite: Scalars['Boolean']['output'];
  deleteSensorCatalogEntry: Scalars['Boolean']['output'];
  login: AuthPayload;
  logout: Scalars['Boolean']['output'];
  resetAdminSiteMeasurements: ResetAdminSiteMeasurementsPayload;
  resetAdminUserPassword: Scalars['Boolean']['output'];
  resolveAlert: Scalars['Boolean']['output'];
  rotateAdminDeviceApiKey: RotateAdminDeviceApiKeyPayload;
  updateAdminDevice: AdminDeviceModel;
  updateAdminSite: AdminSiteModel;
  updateAdminUser: AdminUserModel;
  updateMe: UserModel;
  updateSensorCatalogEntry: SensorCatalogEntryModel;
};


export type MutationClearAdminSiteSnapshotsArgs = {
  siteId: Scalars['String']['input'];
};


export type MutationCreateAdminDeviceArgs = {
  input: CreateAdminDeviceInput;
};


export type MutationCreateAdminSiteArgs = {
  input: CreateAdminSiteInput;
};


export type MutationCreateAdminUserArgs = {
  input: CreateAdminUserInput;
};


export type MutationCreateSensorCatalogEntryArgs = {
  input: CreateSensorCatalogEntryInput;
};


export type MutationDeleteAdminDeviceArgs = {
  deviceId: Scalars['String']['input'];
};


export type MutationDeleteAdminSiteArgs = {
  siteId: Scalars['String']['input'];
};


export type MutationDeleteSensorCatalogEntryArgs = {
  key: Scalars['String']['input'];
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationResetAdminSiteMeasurementsArgs = {
  siteId: Scalars['String']['input'];
};


export type MutationResetAdminUserPasswordArgs = {
  id: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};


export type MutationResolveAlertArgs = {
  id: Scalars['String']['input'];
};


export type MutationRotateAdminDeviceApiKeyArgs = {
  deviceId: Scalars['String']['input'];
};


export type MutationUpdateAdminDeviceArgs = {
  input: UpdateAdminDeviceInput;
};


export type MutationUpdateAdminSiteArgs = {
  input: UpdateAdminSiteInput;
};


export type MutationUpdateAdminUserArgs = {
  input: UpdateAdminUserInput;
};


export type MutationUpdateMeArgs = {
  input: UpdateMeInput;
};


export type MutationUpdateSensorCatalogEntryArgs = {
  input: UpdateSensorCatalogEntryInput;
};

export type Query = {
  __typename?: 'Query';
  adminDevice: AdminDeviceModel;
  adminDevices: Array<AdminDeviceModel>;
  adminSites: Array<AdminSiteModel>;
  adminUsers: Array<AdminUserModel>;
  getAlerts: Array<AlertModel>;
  getMe: UserModel;
  getMeasurements: Array<MeasurementModel>;
  getSensorMeasurements: Array<MeasurementModel>;
  getSite: SiteModel;
  getSites: Array<SiteModel>;
  sensorCatalog: Array<SensorCatalogEntryModel>;
};


export type QueryAdminDeviceArgs = {
  id: Scalars['String']['input'];
};


export type QueryAdminDevicesArgs = {
  siteId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetAlertsArgs = {
  siteId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<AlertStatus>;
  type?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetMeasurementsArgs = {
  range: TimeRange;
  siteId: Scalars['String']['input'];
};


export type QueryGetSensorMeasurementsArgs = {
  deviceId: Scalars['String']['input'];
  range: TimeRange;
  sensorKey: Scalars['String']['input'];
  siteId: Scalars['String']['input'];
};


export type QueryGetSiteArgs = {
  id: Scalars['String']['input'];
};

export type ResetAdminSiteMeasurementsPayload = {
  __typename?: 'ResetAdminSiteMeasurementsPayload';
  deletedMeasurements: Scalars['Int']['output'];
  resolvedAlerts: Scalars['Int']['output'];
  siteId: Scalars['String']['output'];
};

export enum Role {
  Admin = 'ADMIN',
  SiteManager = 'SITE_MANAGER',
  SiteViewer = 'SITE_VIEWER'
}

export type RotateAdminDeviceApiKeyPayload = {
  __typename?: 'RotateAdminDeviceApiKeyPayload';
  plainApiKey: Scalars['String']['output'];
};

export type SensorCatalogEntryModel = {
  __typename?: 'SensorCatalogEntryModel';
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  model: Scalars['String']['output'];
  physicalMax?: Maybe<Scalars['Float']['output']>;
  physicalMin?: Maybe<Scalars['Float']['output']>;
  sensorType: SensorType;
  sortOrder: Scalars['Int']['output'];
  unit: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  wiringTemplate: SensorWiringTemplateModel;
};

export enum SensorType {
  Ph = 'ph',
  Temperature = 'temperature',
  WaterFlow = 'waterFlow',
  WaterLevel = 'waterLevel'
}

export type SensorWireDefInput = {
  color: Scalars['String']['input'];
  id: Scalars['String']['input'];
  label: Scalars['String']['input'];
  required?: InputMaybe<Scalars['Boolean']['input']>;
};

export type SensorWireDefModel = {
  __typename?: 'SensorWireDefModel';
  color: Scalars['String']['output'];
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  required?: Maybe<Scalars['Boolean']['output']>;
};

export type SensorWiringTemplateInput = {
  allowExtraWires?: InputMaybe<Scalars['Boolean']['input']>;
  maxExtraWires?: InputMaybe<Scalars['Int']['input']>;
  wires: Array<SensorWireDefInput>;
};

export type SensorWiringTemplateModel = {
  __typename?: 'SensorWiringTemplateModel';
  allowExtraWires?: Maybe<Scalars['Boolean']['output']>;
  maxExtraWires?: Maybe<Scalars['Int']['output']>;
  wires: Array<SensorWireDefModel>;
};

export type SiteDeviceSnapshotSettingsInput = {
  deviceId: Scalars['String']['input'];
  snapshotsEnabled: Scalars['Boolean']['input'];
};

export type SiteDeviceSnapshotSettingsModel = {
  __typename?: 'SiteDeviceSnapshotSettingsModel';
  deviceId: Scalars['String']['output'];
  deviceName?: Maybe<Scalars['String']['output']>;
  hasCamera: Scalars['Boolean']['output'];
  snapshotsEnabled: Scalars['Boolean']['output'];
};

export type SiteModel = {
  __typename?: 'SiteModel';
  id: Scalars['String']['output'];
  lastUpdate?: Maybe<Scalars['DateTime']['output']>;
  latestSnapshot?: Maybe<DeviceSnapshotModel>;
  latitude?: Maybe<Scalars['Float']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  pollIntervalSeconds: Scalars['Float']['output'];
  recentSnapshots: Array<DeviceSnapshotModel>;
  role: Role;
  sensorReporting: Array<SiteSensorReportingModel>;
  status: SiteStatus;
};

export type SiteSensorReportingInput = {
  deviceId: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  sensorKey: Scalars['String']['input'];
};

export type SiteSensorReportingModel = {
  __typename?: 'SiteSensorReportingModel';
  deviceId: Scalars['String']['output'];
  deviceName?: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  model: Scalars['String']['output'];
  sensorKey: Scalars['String']['output'];
  sensorType: SensorType;
  sortOrder: Scalars['Int']['output'];
  unit: Scalars['String']['output'];
};

export type SiteSensorThresholdInput = {
  criticalDelta?: InputMaybe<Scalars['Float']['input']>;
  deviceId: Scalars['String']['input'];
  normalMax?: InputMaybe<Scalars['Float']['input']>;
  normalMin?: InputMaybe<Scalars['Float']['input']>;
  sensorKey: Scalars['String']['input'];
  warningDelta?: InputMaybe<Scalars['Float']['input']>;
};

export type SiteSensorThresholdModel = {
  __typename?: 'SiteSensorThresholdModel';
  criticalDelta?: Maybe<Scalars['Float']['output']>;
  deviceId: Scalars['String']['output'];
  normalMax?: Maybe<Scalars['Float']['output']>;
  normalMin?: Maybe<Scalars['Float']['output']>;
  sensorKey: Scalars['String']['output'];
  warningDelta?: Maybe<Scalars['Float']['output']>;
};

export enum SiteStatus {
  Critical = 'CRITICAL',
  Ok = 'OK',
  Unknown = 'UNKNOWN',
  Warning = 'WARNING'
}

export enum TimeRange {
  Last_7D = 'LAST_7D',
  Last_24H = 'LAST_24H',
  Last_30D = 'LAST_30D'
}

export type UpdateAdminDeviceInput = {
  board?: InputMaybe<Scalars['String']['input']>;
  deviceId: Scalars['String']['input'];
  expectedIntervalSeconds?: InputMaybe<Scalars['Int']['input']>;
  hasCamera?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  pinMap?: InputMaybe<Scalars['JSON']['input']>;
  reportIntervalSeconds?: InputMaybe<Scalars['Int']['input']>;
  siteId?: InputMaybe<Scalars['String']['input']>;
  snapshotIntervalSeconds?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateAdminSiteInput = {
  attachDeviceId?: InputMaybe<Scalars['String']['input']>;
  deviceSnapshotSettings?: InputMaybe<Array<SiteDeviceSnapshotSettingsInput>>;
  id: Scalars['String']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sensorReporting?: InputMaybe<Array<SiteSensorReportingInput>>;
  sensorThresholds?: InputMaybe<Array<SiteSensorThresholdInput>>;
};

export type UpdateAdminUserInput = {
  assignedSiteIds?: InputMaybe<Array<Scalars['String']['input']>>;
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Role>;
};

export type UpdateMeInput = {
  currentPassword: Scalars['String']['input'];
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  newPassword?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSensorCatalogEntryInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  model?: InputMaybe<Scalars['String']['input']>;
  physicalMax?: InputMaybe<Scalars['Float']['input']>;
  physicalMin?: InputMaybe<Scalars['Float']['input']>;
  sortOrder?: InputMaybe<Scalars['Int']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  wiringTemplate?: InputMaybe<SensorWiringTemplateInput>;
};

export type UserModel = {
  __typename?: 'UserModel';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  role: Role;
  updatedAt: Scalars['DateTime']['output'];
};

export type SensorCatalogQueryVariables = Exact<{ [key: string]: never; }>;


export type SensorCatalogQuery = { __typename?: 'Query', sensorCatalog: Array<{ __typename?: 'SensorCatalogEntryModel', key: string, sensorType: SensorType, model: string, displayName: string, unit: string, physicalMin?: number | null, physicalMax?: number | null, sortOrder: number, icon?: string | null, createdAt: any, updatedAt: any, wiringTemplate: { __typename?: 'SensorWiringTemplateModel', allowExtraWires?: boolean | null, maxExtraWires?: number | null, wires: Array<{ __typename?: 'SensorWireDefModel', id: string, label: string, color: string, required?: boolean | null }> } }> };

export type AdminUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminUsersQuery = { __typename?: 'Query', adminUsers: Array<{ __typename?: 'AdminUserModel', id: string, email: string, name: string, role: Role, createdAt: any, updatedAt: any, assignedSiteIds: Array<string> }> };

export type AdminSitesQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminSitesQuery = { __typename?: 'Query', adminSites: Array<{ __typename?: 'AdminSiteModel', id: string, name: string, latitude?: number | null, longitude?: number | null, sensorReporting: Array<{ __typename?: 'SiteSensorReportingModel', deviceId: string, deviceName?: string | null, sensorKey: string, sensorType: SensorType, model: string, enabled: boolean, displayName: string, unit: string, sortOrder: number, icon?: string | null }>, sensorThresholds: Array<{ __typename?: 'SiteSensorThresholdModel', deviceId: string, sensorKey: string, normalMin?: number | null, normalMax?: number | null, warningDelta?: number | null, criticalDelta?: number | null }>, deviceSnapshotSettings: Array<{ __typename?: 'SiteDeviceSnapshotSettingsModel', deviceId: string, deviceName?: string | null, hasCamera: boolean, snapshotsEnabled: boolean }> }> };

export type AdminDevicesQueryVariables = Exact<{
  siteId?: InputMaybe<Scalars['String']['input']>;
}>;


export type AdminDevicesQuery = { __typename?: 'Query', adminDevices: Array<{ __typename?: 'AdminDeviceModel', deviceId: string, name?: string | null, siteId?: string | null, lastSeenAt?: any | null, expectedIntervalSeconds: number, reportIntervalSeconds: number, snapshotIntervalSeconds: number, hasCamera: boolean, board?: string | null, createdAt: any, updatedAt: any, sensorReadings: Array<{ __typename?: 'AdminDeviceSensorReadingModel', sensorKey: string, sensorType: SensorType, displayName: string, unit: string, icon?: string | null, value?: number | null, takenAt?: any | null }> }> };

export type AdminDeviceQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type AdminDeviceQuery = { __typename?: 'Query', adminDevice: { __typename?: 'AdminDeviceModel', deviceId: string, name?: string | null, siteId?: string | null, lastSeenAt?: any | null, expectedIntervalSeconds: number, reportIntervalSeconds: number, snapshotIntervalSeconds: number, hasCamera: boolean, board?: string | null, pinMap?: any | null, createdAt: any, updatedAt: any, recentSnapshots: Array<{ __typename?: 'DeviceSnapshotModel', id: string, takenAt: any, imageUrl: string, byteSize: number }> } };

export type CreateSensorCatalogEntryMutationVariables = Exact<{
  input: CreateSensorCatalogEntryInput;
}>;


export type CreateSensorCatalogEntryMutation = { __typename?: 'Mutation', createSensorCatalogEntry: { __typename?: 'SensorCatalogEntryModel', key: string, sensorType: SensorType, model: string, displayName: string, unit: string, physicalMin?: number | null, physicalMax?: number | null, sortOrder: number, icon?: string | null, createdAt: any, updatedAt: any, wiringTemplate: { __typename?: 'SensorWiringTemplateModel', allowExtraWires?: boolean | null, maxExtraWires?: number | null, wires: Array<{ __typename?: 'SensorWireDefModel', id: string, label: string, color: string, required?: boolean | null }> } } };

export type UpdateSensorCatalogEntryMutationVariables = Exact<{
  input: UpdateSensorCatalogEntryInput;
}>;


export type UpdateSensorCatalogEntryMutation = { __typename?: 'Mutation', updateSensorCatalogEntry: { __typename?: 'SensorCatalogEntryModel', key: string, sensorType: SensorType, model: string, displayName: string, unit: string, physicalMin?: number | null, physicalMax?: number | null, sortOrder: number, icon?: string | null, createdAt: any, updatedAt: any, wiringTemplate: { __typename?: 'SensorWiringTemplateModel', allowExtraWires?: boolean | null, maxExtraWires?: number | null, wires: Array<{ __typename?: 'SensorWireDefModel', id: string, label: string, color: string, required?: boolean | null }> } } };

export type DeleteSensorCatalogEntryMutationVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type DeleteSensorCatalogEntryMutation = { __typename?: 'Mutation', deleteSensorCatalogEntry: boolean };

export type CreateAdminUserMutationVariables = Exact<{
  input: CreateAdminUserInput;
}>;


export type CreateAdminUserMutation = { __typename?: 'Mutation', createAdminUser: { __typename?: 'AdminUserModel', id: string, email: string, name: string, role: Role, createdAt: any, updatedAt: any, assignedSiteIds: Array<string> } };

export type UpdateAdminUserMutationVariables = Exact<{
  input: UpdateAdminUserInput;
}>;


export type UpdateAdminUserMutation = { __typename?: 'Mutation', updateAdminUser: { __typename?: 'AdminUserModel', id: string, email: string, name: string, role: Role, createdAt: any, updatedAt: any, assignedSiteIds: Array<string> } };

export type ResetAdminUserPasswordMutationVariables = Exact<{
  id: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ResetAdminUserPasswordMutation = { __typename?: 'Mutation', resetAdminUserPassword: boolean };

export type CreateAdminSiteMutationVariables = Exact<{
  input: CreateAdminSiteInput;
}>;


export type CreateAdminSiteMutation = { __typename?: 'Mutation', createAdminSite: { __typename?: 'AdminSiteModel', id: string, name: string, latitude?: number | null, longitude?: number | null, sensorReporting: Array<{ __typename?: 'SiteSensorReportingModel', deviceId: string, deviceName?: string | null, sensorKey: string, sensorType: SensorType, model: string, enabled: boolean, displayName: string, unit: string, sortOrder: number, icon?: string | null }>, sensorThresholds: Array<{ __typename?: 'SiteSensorThresholdModel', deviceId: string, sensorKey: string, normalMin?: number | null, normalMax?: number | null, warningDelta?: number | null, criticalDelta?: number | null }>, deviceSnapshotSettings: Array<{ __typename?: 'SiteDeviceSnapshotSettingsModel', deviceId: string, deviceName?: string | null, hasCamera: boolean, snapshotsEnabled: boolean }> } };

export type UpdateAdminSiteMutationVariables = Exact<{
  input: UpdateAdminSiteInput;
}>;


export type UpdateAdminSiteMutation = { __typename?: 'Mutation', updateAdminSite: { __typename?: 'AdminSiteModel', id: string, name: string, latitude?: number | null, longitude?: number | null, sensorReporting: Array<{ __typename?: 'SiteSensorReportingModel', deviceId: string, deviceName?: string | null, sensorKey: string, sensorType: SensorType, model: string, enabled: boolean, displayName: string, unit: string, sortOrder: number, icon?: string | null }>, sensorThresholds: Array<{ __typename?: 'SiteSensorThresholdModel', deviceId: string, sensorKey: string, normalMin?: number | null, normalMax?: number | null, warningDelta?: number | null, criticalDelta?: number | null }>, deviceSnapshotSettings: Array<{ __typename?: 'SiteDeviceSnapshotSettingsModel', deviceId: string, deviceName?: string | null, hasCamera: boolean, snapshotsEnabled: boolean }> } };

export type CreateAdminDeviceMutationVariables = Exact<{
  input: CreateAdminDeviceInput;
}>;


export type CreateAdminDeviceMutation = { __typename?: 'Mutation', createAdminDevice: { __typename?: 'CreateAdminDevicePayload', plainApiKey: string, device: { __typename?: 'AdminDeviceModel', deviceId: string, name?: string | null, siteId?: string | null, lastSeenAt?: any | null, expectedIntervalSeconds: number, reportIntervalSeconds: number, snapshotIntervalSeconds: number, hasCamera: boolean, board?: string | null, createdAt: any, updatedAt: any } } };

export type UpdateAdminDeviceMutationVariables = Exact<{
  input: UpdateAdminDeviceInput;
}>;


export type UpdateAdminDeviceMutation = { __typename?: 'Mutation', updateAdminDevice: { __typename?: 'AdminDeviceModel', deviceId: string, name?: string | null, siteId?: string | null, pinMap?: any | null, lastSeenAt?: any | null, expectedIntervalSeconds: number, reportIntervalSeconds: number, snapshotIntervalSeconds: number, hasCamera: boolean, board?: string | null, createdAt: any, updatedAt: any } };

export type RotateAdminDeviceApiKeyMutationVariables = Exact<{
  deviceId: Scalars['String']['input'];
}>;


export type RotateAdminDeviceApiKeyMutation = { __typename?: 'Mutation', rotateAdminDeviceApiKey: { __typename?: 'RotateAdminDeviceApiKeyPayload', plainApiKey: string } };

export type DeleteAdminDeviceMutationVariables = Exact<{
  deviceId: Scalars['String']['input'];
}>;


export type DeleteAdminDeviceMutation = { __typename?: 'Mutation', deleteAdminDevice: boolean };

export type DeleteAdminSiteMutationVariables = Exact<{
  siteId: Scalars['String']['input'];
}>;


export type DeleteAdminSiteMutation = { __typename?: 'Mutation', deleteAdminSite: boolean };

export type ResetAdminSiteMeasurementsMutationVariables = Exact<{
  siteId: Scalars['String']['input'];
}>;


export type ResetAdminSiteMeasurementsMutation = { __typename?: 'Mutation', resetAdminSiteMeasurements: { __typename?: 'ResetAdminSiteMeasurementsPayload', siteId: string, deletedMeasurements: number, resolvedAlerts: number } };

export type ClearAdminSiteSnapshotsMutationVariables = Exact<{
  siteId: Scalars['String']['input'];
}>;


export type ClearAdminSiteSnapshotsMutation = { __typename?: 'Mutation', clearAdminSiteSnapshots: { __typename?: 'ClearAdminSiteSnapshotsPayload', siteId: string, deletedSnapshots: number, deletedStorageObjects: number, storageSkipped: boolean } };

export type GetAlertsQueryVariables = Exact<{
  siteId?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<AlertStatus>;
}>;


export type GetAlertsQuery = { __typename?: 'Query', getAlerts: Array<{ __typename?: 'AlertModel', id: string, siteId: string, deviceId?: string | null, deviceName?: string | null, type: string, severity: AlertSeverity, status: AlertStatus, message: string, lastNotifiedAt?: any | null, createdAt: any, updatedAt: any }> };

export type GetMeQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMeQuery = { __typename?: 'Query', getMe: { __typename?: 'UserModel', id: string, email: string, name: string, role: Role } };

export type GetSensorMeasurementsQueryVariables = Exact<{
  siteId: Scalars['String']['input'];
  deviceId: Scalars['String']['input'];
  sensorKey: Scalars['String']['input'];
  range: TimeRange;
}>;


export type GetSensorMeasurementsQuery = { __typename?: 'Query', getSensorMeasurements: Array<{ __typename?: 'MeasurementModel', id: string, sensor: string, value: number, takenAt: any }> };

export type GetSiteQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetSiteQuery = { __typename?: 'Query', getSite: { __typename?: 'SiteModel', id: string, name: string, role: Role, status: SiteStatus, lastUpdate?: any | null, latitude?: number | null, longitude?: number | null, pollIntervalSeconds: number, sensorReporting: Array<{ __typename?: 'SiteSensorReportingModel', deviceId: string, deviceName?: string | null, sensorKey: string, sensorType: SensorType, model: string, enabled: boolean, displayName: string, unit: string, sortOrder: number, icon?: string | null }>, latestSnapshot?: { __typename?: 'DeviceSnapshotModel', id: string, deviceId: string, deviceName?: string | null, takenAt: any, imageUrl: string, byteSize: number } | null, recentSnapshots: Array<{ __typename?: 'DeviceSnapshotModel', id: string, deviceId: string, deviceName?: string | null, takenAt: any, imageUrl: string, byteSize: number }> } };

export type GetSitesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSitesQuery = { __typename?: 'Query', getSites: Array<{ __typename?: 'SiteModel', id: string, name: string, role: Role, status: SiteStatus, lastUpdate?: any | null, latitude?: number | null, longitude?: number | null, pollIntervalSeconds: number }> };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', ok: boolean, user: { __typename?: 'UserModel', id: string, email: string, name: string, role: Role } } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type ResolveAlertMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type ResolveAlertMutation = { __typename?: 'Mutation', resolveAlert: boolean };

export type UpdateMeMutationVariables = Exact<{
  input: UpdateMeInput;
}>;


export type UpdateMeMutation = { __typename?: 'Mutation', updateMe: { __typename?: 'UserModel', id: string, email: string, name: string, role: Role } };


export const SensorCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SensorCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sensorCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"sensorType"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"physicalMin"}},{"kind":"Field","name":{"kind":"Name","value":"physicalMax"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"wiringTemplate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"wires"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"required"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowExtraWires"}},{"kind":"Field","name":{"kind":"Name","value":"maxExtraWires"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<SensorCatalogQuery, SensorCatalogQueryVariables>;
export const AdminUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"assignedSiteIds"}}]}}]}}]} as unknown as DocumentNode<AdminUsersQuery, AdminUsersQueryVariables>;
export const AdminSitesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminSites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminSites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"sensorReporting"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"sensorKey"}},{"kind":"Field","name":{"kind":"Name","value":"sensorType"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sensorThresholds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"sensorKey"}},{"kind":"Field","name":{"kind":"Name","value":"normalMin"}},{"kind":"Field","name":{"kind":"Name","value":"normalMax"}},{"kind":"Field","name":{"kind":"Name","value":"warningDelta"}},{"kind":"Field","name":{"kind":"Name","value":"criticalDelta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deviceSnapshotSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"hasCamera"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotsEnabled"}}]}}]}}]}}]} as unknown as DocumentNode<AdminSitesQuery, AdminSitesQueryVariables>;
export const AdminDevicesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminDevices"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminDevices"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"lastSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"expectedIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"reportIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"hasCamera"}},{"kind":"Field","name":{"kind":"Name","value":"board"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"sensorReadings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sensorKey"}},{"kind":"Field","name":{"kind":"Name","value":"sensorType"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"takenAt"}}]}}]}}]}}]} as unknown as DocumentNode<AdminDevicesQuery, AdminDevicesQueryVariables>;
export const AdminDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"lastSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"expectedIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"reportIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"hasCamera"}},{"kind":"Field","name":{"kind":"Name","value":"board"}},{"kind":"Field","name":{"kind":"Name","value":"pinMap"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"recentSnapshots"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"takenAt"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"byteSize"}}]}}]}}]}}]} as unknown as DocumentNode<AdminDeviceQuery, AdminDeviceQueryVariables>;
export const CreateSensorCatalogEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSensorCatalogEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSensorCatalogEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSensorCatalogEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"sensorType"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"physicalMin"}},{"kind":"Field","name":{"kind":"Name","value":"physicalMax"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"wiringTemplate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"wires"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"required"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowExtraWires"}},{"kind":"Field","name":{"kind":"Name","value":"maxExtraWires"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateSensorCatalogEntryMutation, CreateSensorCatalogEntryMutationVariables>;
export const UpdateSensorCatalogEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSensorCatalogEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSensorCatalogEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSensorCatalogEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"sensorType"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"physicalMin"}},{"kind":"Field","name":{"kind":"Name","value":"physicalMax"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}},{"kind":"Field","name":{"kind":"Name","value":"wiringTemplate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"wires"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"required"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowExtraWires"}},{"kind":"Field","name":{"kind":"Name","value":"maxExtraWires"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateSensorCatalogEntryMutation, UpdateSensorCatalogEntryMutationVariables>;
export const DeleteSensorCatalogEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSensorCatalogEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSensorCatalogEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}]}]}}]} as unknown as DocumentNode<DeleteSensorCatalogEntryMutation, DeleteSensorCatalogEntryMutationVariables>;
export const CreateAdminUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAdminUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAdminUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAdminUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"assignedSiteIds"}}]}}]}}]} as unknown as DocumentNode<CreateAdminUserMutation, CreateAdminUserMutationVariables>;
export const UpdateAdminUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAdminUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAdminUserInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAdminUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"assignedSiteIds"}}]}}]}}]} as unknown as DocumentNode<UpdateAdminUserMutation, UpdateAdminUserMutationVariables>;
export const ResetAdminUserPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetAdminUserPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetAdminUserPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}]}]}}]} as unknown as DocumentNode<ResetAdminUserPasswordMutation, ResetAdminUserPasswordMutationVariables>;
export const CreateAdminSiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAdminSite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAdminSiteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAdminSite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"sensorReporting"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"sensorKey"}},{"kind":"Field","name":{"kind":"Name","value":"sensorType"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sensorThresholds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"sensorKey"}},{"kind":"Field","name":{"kind":"Name","value":"normalMin"}},{"kind":"Field","name":{"kind":"Name","value":"normalMax"}},{"kind":"Field","name":{"kind":"Name","value":"warningDelta"}},{"kind":"Field","name":{"kind":"Name","value":"criticalDelta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deviceSnapshotSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"hasCamera"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotsEnabled"}}]}}]}}]}}]} as unknown as DocumentNode<CreateAdminSiteMutation, CreateAdminSiteMutationVariables>;
export const UpdateAdminSiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAdminSite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAdminSiteInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAdminSite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"sensorReporting"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"sensorKey"}},{"kind":"Field","name":{"kind":"Name","value":"sensorType"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sensorThresholds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"sensorKey"}},{"kind":"Field","name":{"kind":"Name","value":"normalMin"}},{"kind":"Field","name":{"kind":"Name","value":"normalMax"}},{"kind":"Field","name":{"kind":"Name","value":"warningDelta"}},{"kind":"Field","name":{"kind":"Name","value":"criticalDelta"}}]}},{"kind":"Field","name":{"kind":"Name","value":"deviceSnapshotSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"hasCamera"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotsEnabled"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateAdminSiteMutation, UpdateAdminSiteMutationVariables>;
export const CreateAdminDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateAdminDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateAdminDeviceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createAdminDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plainApiKey"}},{"kind":"Field","name":{"kind":"Name","value":"device"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"lastSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"expectedIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"reportIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"hasCamera"}},{"kind":"Field","name":{"kind":"Name","value":"board"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<CreateAdminDeviceMutation, CreateAdminDeviceMutationVariables>;
export const UpdateAdminDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAdminDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAdminDeviceInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAdminDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"pinMap"}},{"kind":"Field","name":{"kind":"Name","value":"lastSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"expectedIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"reportIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"snapshotIntervalSeconds"}},{"kind":"Field","name":{"kind":"Name","value":"hasCamera"}},{"kind":"Field","name":{"kind":"Name","value":"board"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateAdminDeviceMutation, UpdateAdminDeviceMutationVariables>;
export const RotateAdminDeviceApiKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RotateAdminDeviceApiKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rotateAdminDeviceApiKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plainApiKey"}}]}}]}}]} as unknown as DocumentNode<RotateAdminDeviceApiKeyMutation, RotateAdminDeviceApiKeyMutationVariables>;
export const DeleteAdminDeviceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAdminDevice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAdminDevice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}}]}]}}]} as unknown as DocumentNode<DeleteAdminDeviceMutation, DeleteAdminDeviceMutationVariables>;
export const DeleteAdminSiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAdminSite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAdminSite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}]}]}}]} as unknown as DocumentNode<DeleteAdminSiteMutation, DeleteAdminSiteMutationVariables>;
export const ResetAdminSiteMeasurementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetAdminSiteMeasurements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetAdminSiteMeasurements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"deletedMeasurements"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedAlerts"}}]}}]}}]} as unknown as DocumentNode<ResetAdminSiteMeasurementsMutation, ResetAdminSiteMeasurementsMutationVariables>;
export const ClearAdminSiteSnapshotsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClearAdminSiteSnapshots"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clearAdminSiteSnapshots"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"deletedSnapshots"}},{"kind":"Field","name":{"kind":"Name","value":"deletedStorageObjects"}},{"kind":"Field","name":{"kind":"Name","value":"storageSkipped"}}]}}]}}]} as unknown as DocumentNode<ClearAdminSiteSnapshotsMutation, ClearAdminSiteSnapshotsMutationVariables>;
export const GetAlertsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAlerts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"AlertStatus"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getAlerts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"lastNotifiedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<GetAlertsQuery, GetAlertsQueryVariables>;
export const GetMeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getMe"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<GetMeQuery, GetMeQueryVariables>;
export const GetSensorMeasurementsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSensorMeasurements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sensorKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"range"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TimeRange"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getSensorMeasurements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"deviceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deviceId"}}},{"kind":"Argument","name":{"kind":"Name","value":"sensorKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sensorKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"range"},"value":{"kind":"Variable","name":{"kind":"Name","value":"range"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"sensor"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"takenAt"}}]}}]}}]} as unknown as DocumentNode<GetSensorMeasurementsQuery, GetSensorMeasurementsQueryVariables>;
export const GetSiteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getSite"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"lastUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"sensorReporting"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"sensorKey"}},{"kind":"Field","name":{"kind":"Name","value":"sensorType"}},{"kind":"Field","name":{"kind":"Name","value":"model"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"sortOrder"}},{"kind":"Field","name":{"kind":"Name","value":"icon"}}]}},{"kind":"Field","name":{"kind":"Name","value":"latestSnapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"takenAt"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"byteSize"}}]}},{"kind":"Field","name":{"kind":"Name","value":"recentSnapshots"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"deviceId"}},{"kind":"Field","name":{"kind":"Name","value":"deviceName"}},{"kind":"Field","name":{"kind":"Name","value":"takenAt"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"byteSize"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pollIntervalSeconds"}}]}}]}}]} as unknown as DocumentNode<GetSiteQuery, GetSiteQueryVariables>;
export const GetSitesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getSites"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"lastUpdate"}},{"kind":"Field","name":{"kind":"Name","value":"latitude"}},{"kind":"Field","name":{"kind":"Name","value":"longitude"}},{"kind":"Field","name":{"kind":"Name","value":"pollIntervalSeconds"}}]}}]}}]} as unknown as DocumentNode<GetSitesQuery, GetSitesQueryVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ok"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"}}]}}]} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const ResolveAlertDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResolveAlert"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resolveAlert"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<ResolveAlertMutation, ResolveAlertMutationVariables>;
export const UpdateMeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateMe"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateMeInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateMe"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<UpdateMeMutation, UpdateMeMutationVariables>;