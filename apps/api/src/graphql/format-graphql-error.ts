import type { GraphQLFormattedError } from "graphql";

/**
 * Strip server-only details from GraphQL errors before they are sent to clients.
 */
export function formatGraphqlClientError(
  formattedError: GraphQLFormattedError,
  _error: unknown
): GraphQLFormattedError {
  const extensions = { ...(formattedError.extensions ?? {}) } as Record<string, unknown>;
  delete extensions.stacktrace;
  delete extensions.originalError;
  delete extensions.exception;

  const nextExtensions = Object.keys(extensions).length > 0 ? extensions : undefined;

  return {
    ...formattedError,
    extensions: nextExtensions as GraphQLFormattedError["extensions"]
  };
}
