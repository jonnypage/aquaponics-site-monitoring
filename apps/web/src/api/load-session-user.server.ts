import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { print } from "graphql";

import { GetMeDocument, type GetMeQuery } from "~/gql/generated/graphql";

function apiBase(): string {
  const base = import.meta.env.VITE_PUBLIC_API_URL;
  if (!base) {
    throw new Error("VITE_PUBLIC_API_URL is required");
  }
  return base.replace(/\/$/, "");
}

/** SSR-only session fetch — must run inside a server function (not route `beforeLoad` directly). */
export const loadSessionUserFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<GetMeQuery["getMe"] | null> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const cookie = getRequestHeader("cookie");
    if (cookie) {
      headers.Cookie = cookie;
    }

    const res = await fetch(`${apiBase()}/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: print(GetMeDocument) })
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as { data?: GetMeQuery; errors?: unknown[] };
    if (json.errors?.length) {
      return null;
    }
    return json.data?.getMe ?? null;
  }
);
