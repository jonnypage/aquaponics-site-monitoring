import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { GetMeQuery } from "~/gql/generated/graphql";

export type RouterContext = {
  user: GetMeQuery["getMe"] | null;
};

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    context: { user: null } satisfies RouterContext
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
