import { createIsomorphicFn } from "@tanstack/react-start";
import { print, type DocumentNode } from "graphql";

function apiBase(): string {
  const base = import.meta.env.VITE_PUBLIC_API_URL;
  if (!base) {
    throw new Error("VITE_PUBLIC_API_URL is required");
  }
  return base.replace(/\/$/, "");
}

/** On the server, forward the browser cookie so SSR `fetch` to the API is authenticated. */
const getForwardedCookieHeader = createIsomorphicFn()
  .server(async (): Promise<string | undefined> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    return getRequest().headers.get("cookie") ?? undefined;
  })
  .client(async (): Promise<string | undefined> => undefined);

export type GraphqlResponse<T> = { data?: T; errors?: { message: string }[] };

export async function graphqlRequest<TData>(
  document: DocumentNode,
  variables?: object
): Promise<GraphqlResponse<TData>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const cookie = await getForwardedCookieHeader();
  if (cookie) {
    headers.Cookie = cookie;
  }

  const res = await fetch(`${apiBase()}/graphql`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ query: print(document), variables })
  });

  const json = (await res.json()) as GraphqlResponse<TData>;
  if (!res.ok) {
    return { errors: [{ message: `HTTP ${res.status}` }] };
  }
  return json;
}
