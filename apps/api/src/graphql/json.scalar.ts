import { CustomScalar, Scalar } from "@nestjs/graphql";
import { Kind, type ValueNode } from "graphql";

@Scalar("JSON", () => Object)
export class JsonScalar {
  serialize(value: unknown): unknown {
    return value;
  }

  parseValue(value: unknown): unknown {
    return value;
  }

  parseLiteral(ast: ValueNode): unknown {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value) as unknown;
      } catch {
        return null;
      }
    }
    if (ast.kind === Kind.OBJECT) {
      return null;
    }
    return null;
  }
}
