import { Module } from "@nestjs/common";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import type { Request, Response } from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AuthModule } from "../auth/auth.module.js";
import { AuthService } from "../auth/auth.service.js";
import { AlertsModule } from "../alerts/alerts.module.js";
import { MeasurementsModule } from "../measurements/measurements.module.js";
import { SitesModule } from "../sites/sites.module.js";
import type { GqlContext } from "../auth/gql-context.js";
import { formatGraphqlClientError } from "./format-graphql-error.js";

const schemaDir = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    AuthModule,
    SitesModule,
    MeasurementsModule,
    AlertsModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthModule],
      inject: [AuthService],
      useFactory: (authService: AuthService) => ({
        path: "/graphql",
        // Resolved from compiled file: dist/graphql → repo apps/api/schema.graphql
        autoSchemaFile: join(schemaDir, "..", "..", "schema.graphql"),
        context: async ({ req, res }: { req: Request; res: Response }): Promise<GqlContext> => {
          const currentUser = await authService.getCurrentUser(req, res);
          return { req, res, currentUser };
        },
        formatError: formatGraphqlClientError
      })
    })
  ]
})
export class ApiGraphqlModule {}
