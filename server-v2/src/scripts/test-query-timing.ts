import "dotenv/config";

import { pool } from "../db/pool.js";
import { timedQuery } from "../db/timed-query.js";

try {
  await timedQuery("demo.databaseDelay", "SELECT pg_sleep(0.05)");
} finally {
  await pool.end();
}
