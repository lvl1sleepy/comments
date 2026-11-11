import {
  getComplexity,
  simpleEstimator,
  type ComplexityEstimator,
} from "graphql-query-complexity";
import type { Plugin } from "graphql-yoga";
import { GraphQLError } from "graphql/error/GraphQLError.js";

const MAX_QUERY_COST = 100;

const estimators: ComplexityEstimator[] = [
  ({ type, field, args, childComplexity }) => {
    if (
      type.name === "Query" &&
      ["topLevelComments", "commentReplies"].includes(field.name)
    ) {
      const limit = args.limit;

      if (
        typeof limit !== "number" ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 50
      ) {
        return 3 + Math.max(1, childComplexity);
      }

      return 3 + limit * Math.max(1, childComplexity);
    }

    return undefined;
  },

  simpleEstimator({
    defaultComplexity: 1,
  }),
];

export const queryComplexityPlugin: Plugin = {
  onExecute({ args, setResultAndStopExecution }) {
    const complexity = getComplexity({
      schema: args.schema,
      query: args.document,
      variables: args.variableValues ?? {},
      operationName: args.operationName ?? undefined,
      estimators,
    });

    if (complexity > MAX_QUERY_COST) {
      setResultAndStopExecution({
        errors: [
          new GraphQLError("Query is too complex", {
            extensions: {
              code: "QUERY_TOO_COMPLEX",
            },
          }),
        ],
      });

      return;
    }

    console.log("Query complexity:", complexity);
  },
};

export function estimateCommentPageCost(
  limit: number,
  includeAuthor: boolean,
): number {
  return 3 + (1 + (includeAuthor ? 3 : 0)) * limit;
}
