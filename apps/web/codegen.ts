import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../api/schema.graphql",
  documents: ["src/gql/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "src/gql/generated/": {
      preset: "client",
      presetConfig: {
        gqlTagName: "graphql"
      }
    }
  }
};

export default config;
