import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GetSensorMeasurementsDocument,
  GetSiteDocument,
  GetSitesDocument,
  LoginDocument,
  LogoutDocument,
  type GetSensorMeasurementsQuery,
  type GetSensorMeasurementsQueryVariables,
  type GetSiteQuery,
  type GetSitesQuery,
  type LoginMutation,
  type LoginMutationVariables,
  type LogoutMutation,
  type TimeRange
} from "~/gql/generated/graphql";
import { loadSessionUser, sessionUserQueryKey } from "~/api/session";
import { graphqlRequest } from "~/utils/graphql";

const sitesQueryKey = ["sites"] as const;
const siteQueryKey = (id: string) => ["site", id] as const;
const sensorMeasurementsQueryKey = (siteId: string, sensorKey: string, range: TimeRange) =>
  ["sensorMeasurements", siteId, sensorKey, range] as const;

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
