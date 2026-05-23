import { redirect } from "@tanstack/react-router";
import { GetMeDocument, Role, type GetMeQuery } from "~/gql/generated/graphql";
import { graphqlRequest } from "~/utils/graphql";
import type { RouterContext } from "~/router";
import { loadSessionUserFn } from "./load-session-user.server";

/** Shared query key for the session user; use with `queryClient.invalidateQueries` after login/logout. */
export const sessionUserQueryKey = ["me"] as const;

/** Internal fetcher; shared by `useMe` and the root route loader. */
export async function loadSessionUser(): Promise<GetMeQuery["getMe"] | null> {
  if (import.meta.env.SSR) {
    try {
      return await loadSessionUserFn();
    } catch {
      return null;
    }
  }

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
  try {
    return { user: await loadSessionUser() };
  } catch {
    return { user: null };
  }
}

/**
 * Protected route guard. Call from `beforeLoad: ({ context }) => requireAuth(context)`.
 * Redirects to /login if unauthenticated; otherwise narrows `context.user` to non-null
 * for code that runs after the call.
 */
export function requireAuth(
  context: RouterContext
): asserts context is RouterContext & { user: NonNullable<RouterContext["user"]> } {
  if (!context.user) throw redirect({ to: "/login" });
}

/**
 * Guest-only route guard. Call from `beforeLoad: ({ context }) => requireGuest(context)`.
 * Redirects to /sites if already authenticated.
 */
export function requireGuest({ user }: RouterContext): void {
  if (user) throw redirect({ to: "/sites" });
}

/** Only `ADMIN` may access `/admin/*`. Call after `requireAuth`. */
export function requireAdmin(
  context: RouterContext
): asserts context is RouterContext & { user: NonNullable<RouterContext["user"]> } {
  requireAuth(context);
  if (context.user.role !== Role.Admin) {
    throw redirect({ to: "/sites" });
  }
}
