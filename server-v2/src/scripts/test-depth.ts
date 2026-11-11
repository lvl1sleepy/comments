// import { parse, validate, specifiedRules } from "graphql";
// import { printSchema, isObjectType } from "graphql";
// // import { countOperationDepths, depthLimit } from "@graphile/depth-limit";
// import { useDepthLimit } from "@envelop/depth-limit";
// import { schema } from "../graphql/schema.js";

// const query = `
//   query DepthCheck {
//     topLevelComments(postId: "1", limit: 10) {
//       items {
//         id
//         content
//         author {
//           id
//           username
//         }
//       }
//       hasNextPage
//     }
//   }
// `;

// console.log("Query recognized as object:", isObjectType(schema.getQueryType()));

// console.log("Depth using schema object:", countOperationDepths(schema, query));

// console.log(
//   "Depth using schema SDL:",
//   countOperationDepths(printSchema(schema), query),
// );

// console.log("Measured depths:", countOperationDepths(schema, query));

// for (const maxDepth of [0, 1, 2, 3, 5]) {
//   const errors = validate(schema, parse(query), [
//     ...specifiedRules,
//     depthLimit({
//       maxDepth,
//       revealDetails: true,
//     }),
//   ]);

//   console.log(`maxDepth=${maxDepth}`, {
//     rejected: errors.length > 0,
//     errors: errors.map((e) => e.message),
//   });
// }
