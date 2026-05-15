import { redirect } from "@tanstack/react-router";
import { GetMeDocument, type GetMeQuery } from "~/gql/generated/graphql";
import { graphqlRequest } from "~/utils/graphql";
import type { RouterContext } from "~/router";

/** Shared query key for the session user; use with `queryClient.invalidateQueries` after login/logout. */
export const sessionUserQueryKey = ["me"] as const;

/** Internal fetcher; shared by `useMe` and the root route loader. */
export async function loadSessionUser(): Promise<GetMeQuery["getMe"] | null> {
  const r = await graphqlRequest<GetMeQuery>(GetMeDocument);
  if (r.errors?.length) {
    return null;
  }
  return r.data?.getMe ?? null;
}

/**
 * Root route `beforeLoad` — fetches the session user once and injects it into router context.
 * All child routes read `context.user` instead of fetching independently.
 */
export async function loadRootContext(): Promise<RouterContext> {
  return { user: await loadSessionUser() };
}

/**
 * Protected route guard. Call from `beforeLoad: ({ context }) => requireAuth(context)`.
 * Redirects to /login if unauthenticated.
 */
export function requireAuth({ user }: RouterContext): void {
  if (!user) throw redirect({ to: "/login" });
}

/**
 * Guest-only route guard. Call from `beforeLoad: ({ context }) => requireGuest(context)`.
 * Redirects to /sites if already authenticated.
 */
export function requireGuest({ user }: RouterContext): void {
  if (user) throw redirect({ to: "/sites" });
}
