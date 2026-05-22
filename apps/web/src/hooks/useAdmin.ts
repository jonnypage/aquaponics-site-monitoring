import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminDeviceDocument,
  AdminDevicesDocument,
  AdminSitesDocument,
  AdminUsersDocument,
  CreateAdminDeviceDocument,
  CreateAdminSiteDocument,
  CreateAdminUserDocument,
  CreateSensorCatalogEntryDocument,
  ClearAdminSiteSnapshotsDocument,
  DeleteAdminDeviceDocument,
  DeleteSensorCatalogEntryDocument,
  ResetAdminSiteMeasurementsDocument,
  ResetAdminUserPasswordDocument,
  RotateAdminDeviceApiKeyDocument,
  SensorCatalogDocument,
  UpdateAdminDeviceDocument,
  UpdateAdminSiteDocument,
  UpdateAdminUserDocument,
  UpdateSensorCatalogEntryDocument,
  type AdminDeviceQuery,
  type AdminDeviceQueryVariables,
  type AdminDevicesQuery,
  type AdminDevicesQueryVariables,
  type AdminSitesQuery,
  type AdminUsersQuery,
  type CreateAdminDeviceMutation,
  type CreateAdminDeviceMutationVariables,
  type CreateAdminSiteMutation,
  type CreateAdminSiteMutationVariables,
  type CreateAdminUserMutation,
  type CreateAdminUserMutationVariables,
  type CreateSensorCatalogEntryMutation,
  type CreateSensorCatalogEntryMutationVariables,
  type ClearAdminSiteSnapshotsMutation,
  type ClearAdminSiteSnapshotsMutationVariables,
  type DeleteAdminDeviceMutation,
  type DeleteAdminDeviceMutationVariables,
  type ResetAdminSiteMeasurementsMutation,
  type ResetAdminSiteMeasurementsMutationVariables,
  type DeleteSensorCatalogEntryMutation,
  type DeleteSensorCatalogEntryMutationVariables,
  type ResetAdminUserPasswordMutation,
  type ResetAdminUserPasswordMutationVariables,
  type RotateAdminDeviceApiKeyMutation,
  type RotateAdminDeviceApiKeyMutationVariables,
  type SensorCatalogQuery,
  type UpdateAdminDeviceMutation,
  type UpdateAdminDeviceMutationVariables,
  type UpdateAdminSiteMutation,
  type UpdateAdminSiteMutationVariables,
  type UpdateAdminUserMutation,
  type UpdateAdminUserMutationVariables,
  type UpdateSensorCatalogEntryMutation,
  type UpdateSensorCatalogEntryMutationVariables
} from "~/gql/generated/graphql";
import { graphqlRequest } from "~/utils/graphql";
import { invalidateSiteDetailQueries, siteQueryKey, sitesQueryKey } from "~/hooks/useAPI";

export const adminSensorCatalogQueryKey = ["admin", "sensorCatalog"] as const;
export const adminUsersQueryKey = ["admin", "users"] as const;
export const adminSitesQueryKey = ["admin", "sites"] as const;
export const adminDevicesQueryKey = (siteId: string | undefined) => ["admin", "devices", siteId ?? null] as const;
export const adminDeviceQueryKey = (deviceId: string) => ["admin", "device", deviceId] as const;

function unwrap<T>(label: string, payload: { data?: T; errors?: { message: string }[] }): T {
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join(", "));
  }
  if (!payload.data) {
    throw new Error(`${label}: empty response`);
  }
  return payload.data;
}

export function useSensorCatalog() {
  return useQuery({
    queryKey: adminSensorCatalogQueryKey,
    queryFn: async () => {
      const r = await graphqlRequest<SensorCatalogQuery>(SensorCatalogDocument);
      return unwrap("sensorCatalog", r).sensorCatalog;
    }
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: adminUsersQueryKey,
    queryFn: async () => {
      const r = await graphqlRequest<AdminUsersQuery>(AdminUsersDocument);
      return unwrap("adminUsers", r).adminUsers;
    }
  });
}

export function useAdminSites() {
  return useQuery({
    queryKey: adminSitesQueryKey,
    queryFn: async () => {
      const r = await graphqlRequest<AdminSitesQuery>(AdminSitesDocument);
      return unwrap("adminSites", r).adminSites;
    }
  });
}

export function useAdminDevices(siteId?: string) {
  return useQuery({
    queryKey: adminDevicesQueryKey(siteId),
    queryFn: async () => {
      const variables: AdminDevicesQueryVariables = { siteId: siteId ?? undefined };
      const r = await graphqlRequest<AdminDevicesQuery>(AdminDevicesDocument, variables);
      return unwrap("adminDevices", r).adminDevices;
    }
  });
}

export function useAdminDevice(deviceId: string) {
  return useQuery({
    queryKey: adminDeviceQueryKey(deviceId),
    queryFn: async () => {
      const variables: AdminDeviceQueryVariables = { id: deviceId };
      const r = await graphqlRequest<AdminDeviceQuery>(AdminDeviceDocument, variables);
      return unwrap("adminDevice", r).adminDevice;
    },
    enabled: Boolean(deviceId)
  });
}

export function useCreateSensorCatalogEntryMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSensorCatalogEntryMutationVariables["input"]) => {
      const variables: CreateSensorCatalogEntryMutationVariables = { input };
      const r = await graphqlRequest<CreateSensorCatalogEntryMutation>(CreateSensorCatalogEntryDocument, variables);
      return unwrap("createSensorCatalogEntry", r).createSensorCatalogEntry;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSensorCatalogQueryKey });
      void queryClient.invalidateQueries({ queryKey: adminSitesQueryKey });
    }
  });
}

export function useUpdateSensorCatalogEntryMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSensorCatalogEntryMutationVariables["input"]) => {
      const variables: UpdateSensorCatalogEntryMutationVariables = { input };
      const r = await graphqlRequest<UpdateSensorCatalogEntryMutation>(UpdateSensorCatalogEntryDocument, variables);
      return unwrap("updateSensorCatalogEntry", r).updateSensorCatalogEntry;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSensorCatalogQueryKey });
    }
  });
}

export function useDeleteSensorCatalogEntryMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const variables: DeleteSensorCatalogEntryMutationVariables = { key };
      const r = await graphqlRequest<DeleteSensorCatalogEntryMutation>(DeleteSensorCatalogEntryDocument, variables);
      return unwrap("deleteSensorCatalogEntry", r).deleteSensorCatalogEntry;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSensorCatalogQueryKey });
      void queryClient.invalidateQueries({ queryKey: adminSitesQueryKey });
    }
  });
}

export function useCreateAdminUserMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdminUserMutationVariables["input"]) => {
      const variables: CreateAdminUserMutationVariables = { input };
      const r = await graphqlRequest<CreateAdminUserMutation>(CreateAdminUserDocument, variables);
      return unwrap("createAdminUser", r).createAdminUser;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
      void queryClient.invalidateQueries({ queryKey: sitesQueryKey });
    }
  });
}

export function useUpdateAdminUserMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAdminUserMutationVariables["input"]) => {
      const variables: UpdateAdminUserMutationVariables = { input };
      const r = await graphqlRequest<UpdateAdminUserMutation>(UpdateAdminUserDocument, variables);
      return unwrap("updateAdminUser", r).updateAdminUser;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
      void queryClient.invalidateQueries({ queryKey: sitesQueryKey });
    }
  });
}

export function useResetAdminUserPasswordMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: ResetAdminUserPasswordMutationVariables) => {
      const r = await graphqlRequest<ResetAdminUserPasswordMutation>(ResetAdminUserPasswordDocument, vars);
      return unwrap("resetAdminUserPassword", r).resetAdminUserPassword;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    }
  });
}

export function useCreateAdminSiteMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdminSiteMutationVariables["input"]) => {
      const variables: CreateAdminSiteMutationVariables = { input };
      const r = await graphqlRequest<CreateAdminSiteMutation>(CreateAdminSiteDocument, variables);
      return unwrap("createAdminSite", r).createAdminSite;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSitesQueryKey });
      void queryClient.invalidateQueries({ queryKey: sitesQueryKey });
      void queryClient.invalidateQueries({ queryKey: adminDevicesQueryKey(undefined) });
    }
  });
}

export function useUpdateAdminSiteMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAdminSiteMutationVariables["input"]) => {
      const variables: UpdateAdminSiteMutationVariables = { input };
      const r = await graphqlRequest<UpdateAdminSiteMutation>(UpdateAdminSiteDocument, variables);
      return unwrap("updateAdminSite", r).updateAdminSite;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminSitesQueryKey });
      void queryClient.invalidateQueries({ queryKey: sitesQueryKey });
      void queryClient.invalidateQueries({ queryKey: siteQueryKey(variables.id) });
    }
  });
}

export function useCreateAdminDeviceMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdminDeviceMutationVariables["input"]) => {
      const variables: CreateAdminDeviceMutationVariables = { input };
      const r = await graphqlRequest<CreateAdminDeviceMutation>(CreateAdminDeviceDocument, variables);
      return unwrap("createAdminDevice", r).createAdminDevice;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminDevicesQueryKey(undefined) });
    }
  });
}

export function useUpdateAdminDeviceMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAdminDeviceMutationVariables["input"]) => {
      const variables: UpdateAdminDeviceMutationVariables = { input };
      const r = await graphqlRequest<UpdateAdminDeviceMutation>(UpdateAdminDeviceDocument, variables);
      return unwrap("updateAdminDevice", r).updateAdminDevice;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminDevicesQueryKey(undefined) });
      void queryClient.invalidateQueries({ queryKey: adminDeviceQueryKey(variables.deviceId) });
    }
  });
}

export function useRotateAdminDeviceApiKeyMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const variables: RotateAdminDeviceApiKeyMutationVariables = { deviceId };
      const r = await graphqlRequest<RotateAdminDeviceApiKeyMutation>(RotateAdminDeviceApiKeyDocument, variables);
      return unwrap("rotateAdminDeviceApiKey", r).rotateAdminDeviceApiKey;
    },
    onSuccess: (_data, deviceId) => {
      void queryClient.invalidateQueries({ queryKey: adminDevicesQueryKey(undefined) });
      void queryClient.invalidateQueries({ queryKey: adminDeviceQueryKey(deviceId) });
    }
  });
}

export function useDeleteAdminDeviceMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const variables: DeleteAdminDeviceMutationVariables = { deviceId };
      const r = await graphqlRequest<DeleteAdminDeviceMutation>(DeleteAdminDeviceDocument, variables);
      return unwrap("deleteAdminDevice", r).deleteAdminDevice;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminDevicesQueryKey(undefined) });
    }
  });
}

function invalidateSiteTelemetryQueries(queryClient: ReturnType<typeof useQueryClient>, siteId: string) {
  invalidateSiteDetailQueries(queryClient, siteId);
  void queryClient.invalidateQueries({ queryKey: ["alerts"] });
  void queryClient.invalidateQueries({ queryKey: adminDevicesQueryKey(siteId) });
}

export function useResetAdminSiteMeasurementsMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (siteId: string) => {
      const variables: ResetAdminSiteMeasurementsMutationVariables = { siteId };
      const r = await graphqlRequest<ResetAdminSiteMeasurementsMutation>(
        ResetAdminSiteMeasurementsDocument,
        variables
      );
      return unwrap("resetAdminSiteMeasurements", r).resetAdminSiteMeasurements;
    },
    onSuccess: (_data, siteId) => {
      void queryClient.invalidateQueries({ queryKey: adminSitesQueryKey });
      void queryClient.invalidateQueries({ queryKey: sitesQueryKey });
      invalidateSiteTelemetryQueries(queryClient, siteId);
    }
  });
}

export function useClearAdminSiteSnapshotsMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (siteId: string) => {
      const variables: ClearAdminSiteSnapshotsMutationVariables = { siteId };
      const r = await graphqlRequest<ClearAdminSiteSnapshotsMutation>(
        ClearAdminSiteSnapshotsDocument,
        variables
      );
      return unwrap("clearAdminSiteSnapshots", r).clearAdminSiteSnapshots;
    },
    onSuccess: (_data, siteId) => {
      invalidateSiteTelemetryQueries(queryClient, siteId);
      void queryClient.invalidateQueries({ queryKey: adminDevicesQueryKey(undefined) });
    }
  });
}
