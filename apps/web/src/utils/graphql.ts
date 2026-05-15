import { print, type DocumentNode } from "graphql";

function apiBase(): string {
  const base = import.meta.env.VITE_PUBLIC_API_URL;
  if (!base) {
    throw new Error("VITE_PUBLIC_API_URL is required");
  }
  return base.replace(/\/$/, "");
}

export type GraphqlResponse<T> = { data?: T; errors?: { message: string }[] };

export async function graphqlRequest<TData>(
  document: DocumentNode,
  variables?: object
): Promise<GraphqlResponse<TData>> {
  const res = await fetch(`${apiBase()}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ query: print(document), variables })
  });

  const json = (await res.json()) as GraphqlResponse<TData>;
  if (!res.ok) {
    return { errors: [{ message: `HTTP ${res.status}` }] };
  }
  return json;
}
