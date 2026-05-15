import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LoginDocument,
  type LoginMutation,
  type LoginMutationVariables
} from "~/gql/generated/graphql";
import { loadSessionUser, sessionUserQueryKey } from "~/api/session";
import { graphqlRequest } from "~/utils/graphql";

export function useMe() {
  return useQuery({
    queryKey: sessionUserQueryKey,
    queryFn: loadSessionUser
  });
}

export function useLoginMutate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginMutationVariables["input"]) => {
      const variables: LoginMutationVariables = { input };
      const r = await graphqlRequest<LoginMutation>(LoginDocument, variables);
      if (r.errors?.length) {
        throw new Error(r.errors.map((e) => e.message).join(", "));
      }
      if (!r.data?.login?.ok) {
        throw new Error("Login failed");
      }
      return r.data.login;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionUserQueryKey });
    }
  });
}
