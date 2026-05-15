/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query GetMe {\n  getMe {\n    id\n    email\n    name\n    role\n  }\n}": typeof types.GetMeDocument,
    "query GetSensorMeasurements($siteId: String!, $sensorKey: String!, $range: TimeRange!) {\n  getSensorMeasurements(siteId: $siteId, sensorKey: $sensorKey, range: $range) {\n    id\n    sensor\n    value\n    takenAt\n  }\n}": typeof types.GetSensorMeasurementsDocument,
    "query GetSite($id: String!) {\n  getSite(id: $id) {\n    id\n    name\n    role\n    status\n    lastUpdate\n  }\n}": typeof types.GetSiteDocument,
    "query GetSites {\n  getSites {\n    id\n    name\n    role\n    status\n    lastUpdate\n  }\n}": typeof types.GetSitesDocument,
    "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    ok\n    user {\n      id\n      email\n      name\n      role\n    }\n  }\n}": typeof types.LoginDocument,
    "mutation Logout {\n  logout\n}": typeof types.LogoutDocument,
};
const documents: Documents = {
    "query GetMe {\n  getMe {\n    id\n    email\n    name\n    role\n  }\n}": types.GetMeDocument,
    "query GetSensorMeasurements($siteId: String!, $sensorKey: String!, $range: TimeRange!) {\n  getSensorMeasurements(siteId: $siteId, sensorKey: $sensorKey, range: $range) {\n    id\n    sensor\n    value\n    takenAt\n  }\n}": types.GetSensorMeasurementsDocument,
    "query GetSite($id: String!) {\n  getSite(id: $id) {\n    id\n    name\n    role\n    status\n    lastUpdate\n  }\n}": types.GetSiteDocument,
    "query GetSites {\n  getSites {\n    id\n    name\n    role\n    status\n    lastUpdate\n  }\n}": types.GetSitesDocument,
    "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    ok\n    user {\n      id\n      email\n      name\n      role\n    }\n  }\n}": types.LoginDocument,
    "mutation Logout {\n  logout\n}": types.LogoutDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetMe {\n  getMe {\n    id\n    email\n    name\n    role\n  }\n}"): (typeof documents)["query GetMe {\n  getMe {\n    id\n    email\n    name\n    role\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetSensorMeasurements($siteId: String!, $sensorKey: String!, $range: TimeRange!) {\n  getSensorMeasurements(siteId: $siteId, sensorKey: $sensorKey, range: $range) {\n    id\n    sensor\n    value\n    takenAt\n  }\n}"): (typeof documents)["query GetSensorMeasurements($siteId: String!, $sensorKey: String!, $range: TimeRange!) {\n  getSensorMeasurements(siteId: $siteId, sensorKey: $sensorKey, range: $range) {\n    id\n    sensor\n    value\n    takenAt\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetSite($id: String!) {\n  getSite(id: $id) {\n    id\n    name\n    role\n    status\n    lastUpdate\n  }\n}"): (typeof documents)["query GetSite($id: String!) {\n  getSite(id: $id) {\n    id\n    name\n    role\n    status\n    lastUpdate\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query GetSites {\n  getSites {\n    id\n    name\n    role\n    status\n    lastUpdate\n  }\n}"): (typeof documents)["query GetSites {\n  getSites {\n    id\n    name\n    role\n    status\n    lastUpdate\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    ok\n    user {\n      id\n      email\n      name\n      role\n    }\n  }\n}"): (typeof documents)["mutation Login($input: LoginInput!) {\n  login(input: $input) {\n    ok\n    user {\n      id\n      email\n      name\n      role\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "mutation Logout {\n  logout\n}"): (typeof documents)["mutation Logout {\n  logout\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;