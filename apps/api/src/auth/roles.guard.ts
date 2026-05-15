import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { UserRole } from "@aquaponics/db";
import { ROLES_KEY } from "./roles.decorator.js";
import type { GqlContext } from "./gql-context.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const gqlCtx = GqlExecutionContext.create(context).getContext<GqlContext>();
    const currentUser = gqlCtx.currentUser;
    if (!currentUser) {
      throw new ForbiddenException("Access denied");
    }
    if (!requiredRoles.includes(currentUser.role)) {
      throw new ForbiddenException("Insufficient role");
    }

    return true;
  }
}
