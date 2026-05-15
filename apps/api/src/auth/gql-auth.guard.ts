import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { GqlContext } from "./gql-context.js";

@Injectable()
export class GqlAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gqlCtx = GqlExecutionContext.create(context).getContext<GqlContext>();
    if (!gqlCtx.currentUser) {
      throw new UnauthorizedException("Authentication required");
    }
    return true;
  }
}
