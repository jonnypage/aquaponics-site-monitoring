import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  GetAlertsDocument,
  GetSensorMeasurementsDocument,
  GetSiteDocument,
  GetSitesDocument,
  LoginDocument,
  LogoutDocument,
  ResolveAlertDocument,
  RequestSiteTelemetryDocument,
  UpdateMeDocument,
  type GetAlertsQuery,
  type GetAlertsQueryVariables,
  type GetSensorMeasurementsQuery,
  type GetSensorMeasurementsQueryVariables,
  type GetSiteQuery,
  type GetSitesQuery,
  type LoginMutation,
  type LoginMutationVariables,
  type LogoutMutation,
  type ResolveAlertMutation,
  type ResolveAlertMutationVariables,
  type RequestSiteTelemetryMutation,
  type RequestSiteTelemetryMutationVariables,
  type TimeRange,
  type UpdateMeMutation,
  type UpdateMeMutationVariables
} from "~/gql/generated/graphql";
import { loadSessionUser, sessionUserQueryKey } from "~/api/session";
import { SITE_ALERTS_REFETCH_MS, sitePollIntervalMs } from "~/utils/site-poll-interval";
import { graphqlRequest } from "~/utils/graphql";

export const sitesQueryKey = ["sites"] as const;
export const siteQueryKey = (id: string) => ["site", id] as const;
export const sensorMeasurementsQueryKey = (
  siteId: string,
  deviceId: string,
  sensorKey: string,
  range: TimeRange
) => ["sensorMeasurements", siteId, deviceId, sensorKey, range] as const;

export const alertsQueryKey = (vars: Pick<GetAlertsQueryVariables, "siteId" | "type" | "status">) =>
  ["alerts", vars.siteId ?? null, vars.type ?? null, vars.status ?? null] as const;

export type ResolveAlertInput = {
  id: string;
  siteId?: string;
};

function unwrap<T>(label: string, payload: { data?: T; errors?: { message: string }[] }): T {
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join(", "));
  }
  if (!payload.data) {
    throw new Error(`${label}: empty response`);
  }
  return payload.data;
}

/** Refetch site detail queries after alert changes (status badge, charts, alerts list). */
export function invalidateSiteDetailQueries(queryClient: QueryClient, siteId: string) {
  void queryClient.invalidateQueries({ queryKey: siteQueryKey(siteId) });
  void queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "sensorMeasurements" && query.queryKey[1] === siteId
  });
}

export function useMe() {
  return useQuery({
    queryKey: sessionUserQueryKey,
    queryFn: loadSessionUser
  });
}

export function useSites() {
  return useQuery({
    queryKey: sitesQueryKey,
    queryFn: async () => {
      const r = await graphqlRequest<GetSitesQuery>(GetSitesDocument);
      return unwrap("getSites", r).getSites;
    },
    refetchInterval: (query) => {
      const sites = query.state.data;
      if (!sites?.length) {
        return false;
      }
      const minSeconds = Math.min(...sites.map((s) => s.pollIntervalSeconds));
      return sitePollIntervalMs(minSeconds);
    }
  });
}

export function useSite(id: string) {
  return useQuery({
    queryKey: siteQueryKey(id),
    queryFn: async () => {
      const r = await graphqlRequest<GetSiteQuery>(GetSiteDocument, { id });
      return unwrap("getSite", r).getSite;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => sitePollIntervalMs(query.state.data?.pollIntervalSeconds)
  });
}

export function useSensorMeasurements(
  siteId: string,
  deviceId: string,
  sensorKey: string,
  range: TimeRange,
  options?: { refetchIntervalMs?: number }
) {
  return useQuery({
    queryKey: sensorMeasurementsQueryKey(siteId, deviceId, sensorKey, range),
    queryFn: async () => {
      const variables: GetSensorMeasurementsQueryVariables = {
        siteId,
        deviceId,
        sensorKey,
        range
      };
      const r = await graphqlRequest<GetSensorMeasurementsQuery>(GetSensorMeasurementsDocument, variables);
      return unwrap("getSensorMeasurements", r).getSensorMeasurements;
    },
    enabled: Boolean(siteId && deviceId && sensorKey),
    refetchInterval: options?.refetchIntervalMs
  });
}

export function useAlerts(
  variables: GetAlertsQueryVariables,
  options?: { refetchIntervalMs?: number }
) {
  const siteScoped = Boolean(variables.siteId);
  return useQuery({
    queryKey: alertsQueryKey(variables),
    queryFn: async () => {
      const r = await graphqlRequest<GetAlertsQuery>(GetAlertsDocument, variables);
      return unwrap("getAlerts", r).getAlerts;
    },
    refetchInterval: siteScoped
      ? (options?.refetchIntervalMs ?? SITE_ALERTS_REFETCH_MS)
      : false
  });
}

export function useRequestSiteTelemetryMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (siteId: string) => {
      const variables: RequestSiteTelemetryMutationVariables = { siteId };
      const r = await graphqlRequest<RequestSiteTelemetryMutation>(
        RequestSiteTelemetryDocument,
        variables
      );
      return unwrap("requestSiteTelemetry", r).requestSiteTelemetry;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(siteQueryKey(data.id), data);
      invalidateSiteDetailQueries(queryClient, data.id);
      void queryClient.invalidateQueries({ queryKey: sitesQueryKey });
    }
  });
}

export function useResolveAlertMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: ResolveAlertInput) => {
      const variables: ResolveAlertMutationVariables = { id };
      const r = await graphqlRequest<ResolveAlertMutation>(ResolveAlertDocument, variables);
      return unwrap("resolveAlert", r).resolveAlert;
    },
    onSuccess: (_data, { siteId }) => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: sitesQueryKey });
      if (siteId) {
        invalidateSiteDetailQueries(queryClient, siteId);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["site"] });
        void queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "sensorMeasurements"
        });
      }
    }
  });
}

export function useLoginMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginMutationVariables["input"]) => {
      const variables: LoginMutationVariables = { input };
      const r = await graphqlRequest<LoginMutation>(LoginDocument, variables);
      return unwrap("login", r).login;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionUserQueryKey });
    }
  });
}

export function useLogoutMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await graphqlRequest<LogoutMutation>(LogoutDocument);
      return unwrap("logout", r).logout;
    },
    onSuccess: () => {
      queryClient.clear();
    }
  });
}

export function useUpdateMeMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMeMutationVariables["input"]) => {
      const variables: UpdateMeMutationVariables = { input };
      const r = await graphqlRequest<UpdateMeMutation>(UpdateMeDocument, variables);
      return unwrap("updateMe", r).updateMe;
    },
    onSuccess: () => {
      queryClient.clear();
      if (typeof window !== "undefined") {
        window.location.assign("/login");
      }
    }
  });
}
