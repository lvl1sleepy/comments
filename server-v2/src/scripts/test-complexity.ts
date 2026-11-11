import { parse } from "graphql";
import { getComplexity, simpleEstimator } from "graphql-query-complexity";

import { schema } from "../graphql/schema.js";

const query = parse(`
  query Page($limit: Int!) {
  roots: topLevelComments(postId: "1", limit: $limit) {
    items {
      id
      content
    }
  }

  replies: commentReplies(parentId: "1", limit: $limit) {
    items {
      id
      content
    }
  }
}
`);

function calculateCost(limit: number): number {
  return getComplexity({
    schema,
    query,
    variables: { limit },
    estimators: [
      ({ type, field, args, childComplexity }) => {
        if (
          type.name === "Query" &&
          (field.name === "topLevelComments" || field.name === "commentReplies")
        ) {
          return 3 + args.limit * childComplexity;
        }

        return undefined;
      },

      simpleEstimator({ defaultComplexity: 1 }),
    ],
  });
}

console.log("Limit 2:", calculateCost(2));
console.log("Limit 50:", calculateCost(50));
