import { Pool } from "pg";

export const pool = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {}),

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
