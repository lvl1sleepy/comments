import "dotenv/config";
import express from "express";
import { createYoga } from "graphql-yoga";
import { schema } from "./graphql/schema.js";
import { buildAuthContext } from "./graphql/context.js";
import type { GraphQLContext } from "./graphql/context.js";
import { createAuthorLoader } from "./graphql/loaders.js";
import { createSecurityPlugins } from "./graphql/security-plugins.js";
import { graphqlRateLimiter } from "./middleware/graphql-rate-limit.js";
import helmet from "helmet";
import { graphqlCors } from "./middleware/graphql-cors.js";
import { requestContextMiddleware } from "./utils/request-context.js";
import { pool } from "./db/pool.js";

const app = express();

app.use(requestContextMiddleware);

app.use(
  helmet(
    process.env.NODE_ENV === "production"
      ? {}
      : { contentSecurityPolicy: false },
  ),
);

const yoga = createYoga<{}, GraphQLContext>({
  schema,

  cors: false,

  plugins: createSecurityPlugins(),

  context: async ({ request }) => {
    const authorization = request.headers.get("authorization");

    const authContext = await buildAuthContext(authorization);

    return {
      ...authContext,
      loaders: {
        author: createAuthorLoader(),
      },
    };
  },
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(yoga.graphqlEndpoint, graphqlCors, graphqlRateLimiter, yoga);

const PORT = Number(process.env.PORT ?? 4000);

const server = app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}/graphql`);
});

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  // Prevent shutdown from running twice.
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.info(`Received ${signal}. Starting graceful shutdown...`);

  // Safety timeout: don't hang indefinitely.
  const timeout = setTimeout(() => {
    console.error("Shutdown timeout exceeded. Forcing exit.");

    server.closeAllConnections();
    process.exit(1);
  }, 15_000);

  timeout.unref();

  try {
    // 1. Stop accepting new HTTP connections.
    // Wait for active HTTP requests to complete.
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    console.info("HTTP server closed.");

    // 2. Dispose GraphQL Yoga resources.
    await yoga.dispose();
    console.info("GraphQL Yoga disposed.");

    // 3. Close PostgreSQL connections.
    await pool.end();
    console.info("PostgreSQL pool closed.");

    console.info("Graceful shutdown completed.");
  } catch (error) {
    console.error("Graceful shutdown failed:", error);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
