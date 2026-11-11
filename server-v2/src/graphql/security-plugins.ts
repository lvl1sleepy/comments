import { useDepthLimit } from "@envelop/depth-limit";
import { maxAliasesPlugin } from "@escape.tech/graphql-armor-max-aliases";
import { queryComplexityPlugin } from "./complexity.js";

export function createSecurityPlugins(maxDepth = 5) {
  return [
    useDepthLimit({ maxDepth }),

    maxAliasesPlugin({
      n: 10,
      propagateOnRejection: false,
      onReject: [
        (context, error) => {
          if (!context) throw error;
          context.reportError(error);
        },
      ],
    }),

    queryComplexityPlugin,
  ];
}
