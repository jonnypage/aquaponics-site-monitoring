import { redirect } from "@tanstack/react-router";
import { GetMeDocument, Role, type GetMeQuery } from "~/gql/generated/graphql";
import { graphqlRequest } from "~/utils/graphql";
import type { RouterContext } from "~/router";
import { loadSessionUserFn } from "./load-session-user";

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
 * Resolve the session user for protected routes.
 * - SSR: trust root `context.user` only (localhost sends the API cookie to the web host;
 *   split prod hosts need `SESSION_COOKIE_DOMAIN` or client defer below).
 * - Client: re-fetch via GraphQL with `credentials: "include"`.
 */
export async function resolveAuthedUser(
  context: RouterContext
): Promise<GetMeQuery["getMe"] | null> {
  if (context.user) {
    return context.user;
  }
  if (import.meta.env.SSR) {
    return null;
  }
  return loadSessionUser();
}

/**
 * Protected layout guard. SSR without `context.user` defers to the client (split web/API hosts).
 * Client without a session redirects to `/login`.
 */
export async function guardAuthedRoute(
  context: RouterContext
): Promise<{ user: GetMeQuery["getMe"] } | { user: null }> {
  const user = await resolveAuthedUser(context);
  if (user) {
    return { user };
  }
  if (import.meta.env.SSR) {
    return { user: null };
  }
  throw redirect({ to: "/login" });
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

/** Only `ADMIN` may access `/admin/*`. Call after auth is resolved (not during SSR defer). */
export function requireAdmin(
  context: RouterContext
): asserts context is RouterContext & { user: NonNullable<RouterContext["user"]> } {
  requireAuth(context);
  if (context.user.role !== Role.Admin) {
    throw redirect({ to: "/sites" });
  }
}

/** Admin layout guard — skips SSR when parent auth is deferred; enforces on client. */
export function guardAdminRoute(context: RouterContext): void {
  if (import.meta.env.SSR && !context.user) {
    return;
  }
  requireAdmin(context);
}
