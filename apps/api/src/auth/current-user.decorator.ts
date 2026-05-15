import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { GqlContext } from "./gql-context.js";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const gqlCtx = GqlExecutionContext.create(ctx).getContext<GqlContext>();
  return gqlCtx.currentUser;
});
