import { Module } from "@nestjs/common";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import type { Request, Response } from "express";
import { join } from "node:path";
import { AuthModule } from "../auth/auth.module.js";
import { AuthService } from "../auth/auth.service.js";
import type { GqlContext } from "../auth/gql-context.js";

@Module({
  imports: [
    AuthModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthModule],
      inject: [AuthService],
      useFactory: (authService: AuthService) => ({
        path: "/graphql",
        autoSchemaFile: join(process.cwd(), "apps/api/schema.graphql"),
        context: async ({ req, res }: { req: Request; res: Response }): Promise<GqlContext> => {
          const currentUser = await authService.getCurrentUser(req, res);
          return { req, res, currentUser };
        }
      })
    })
  ]
})
export class ApiGraphqlModule {}
