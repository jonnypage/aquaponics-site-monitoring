import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GetAlertsDocument,
  GetSensorMeasurementsDocument,
  GetSiteDocument,
  GetSitesDocument,
  LoginDocument,
  LogoutDocument,
  ResolveAlertDocument,
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
  type TimeRange,
  type UpdateMeMutation,
  type UpdateMeMutationVariables
} from "~/gql/generated/graphql";
import { loadSessionUser, sessionUserQueryKey } from "~/api/session";
import { graphqlRequest } from "~/utils/graphql";

export const sitesQueryKey = ["sites"] as const;
export const siteQueryKey = (id: string) => ["site", id] as const;
const sensorMeasurementsQueryKey = (siteId: string, sensorKey: string, range: TimeRange) =>
  ["sensorMeasurements", siteId, sensorKey, range] as const;

const alertsQueryKey = (vars: Pick<GetAlertsQueryVariables, "siteId" | "type" | "status">) =>
  ["alerts", vars.siteId ?? null, vars.type ?? null, vars.status ?? null] as const;

function unwrap<T>(label: string, payload: { data?: T; errors?: { message: string }[] }): T {
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join(", "));
  }
  if (!payload.data) {
    throw new Error(`${label}: empty response`);
  }
  return payload.data;
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
    enabled: Boolean(id)
  });
}

export function useSensorMeasurements(siteId: string, sensorKey: string, range: TimeRange) {
  return useQuery({
    queryKey: sensorMeasurementsQueryKey(siteId, sensorKey, range),
    queryFn: async () => {
      const variables: GetSensorMeasurementsQueryVariables = { siteId, sensorKey, range };
      const r = await graphqlRequest<GetSensorMeasurementsQuery>(GetSensorMeasurementsDocument, variables);
      return unwrap("getSensorMeasurements", r).getSensorMeasurements;
    },
    enabled: Boolean(siteId && sensorKey)
  });
}

export function useAlerts(variables: GetAlertsQueryVariables) {
  return useQuery({
    queryKey: alertsQueryKey(variables),
    queryFn: async () => {
      const r = await graphqlRequest<GetAlertsQuery>(GetAlertsDocument, variables);
      return unwrap("getAlerts", r).getAlerts;
    }
  });
}

export function useResolveAlertMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const variables: ResolveAlertMutationVariables = { id };
      const r = await graphqlRequest<ResolveAlertMutation>(ResolveAlertDocument, variables);
      return unwrap("resolveAlert", r).resolveAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
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
