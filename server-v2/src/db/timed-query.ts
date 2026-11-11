import { performance } from "node:perf_hooks";
import type { QueryResult, QueryResultRow } from "pg";
import { getRequestId } from "../utils/request-context.js";
import { pool } from "./pool.js";

export async function timedQuery<T extends QueryResultRow>(
  operation: string,
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const start = performance.now();
  let status: "success" | "failure" = "success";

  try {
    return await pool.query<T>(sql, params);
  } catch (error) {
    status = "failure";
    throw error;
  } finally {
    const durationMs = Number((performance.now() - start).toFixed(2));

    console.info(
      JSON.stringify({
        event: "db.query",
        requestId: getRequestId() ?? null,
        operation,
        status,
        durationMs,
      }),
    );
  }
}
