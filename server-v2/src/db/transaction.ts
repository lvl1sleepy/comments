// import type { PoolClient } from "pg";
// import { pool } from "./pool.js";

// export async function withTransaction<T>(
//   operation: (client: PoolClient) => Promise<T>,
// ): Promise<T> {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     const result = await operation(client);

//     await client.query("COMMIT");

//     return result;
//   } catch (error) {
//     try {
//       await client.query("ROLLBACK");
//     } catch (rollbackError) {
//       console.error("Transaction rollback failed:", rollbackError);
//     }

//     throw error;
//   } finally {
//     client.release();
//   }
// }
import type { Pool, PoolClient } from "pg";
import { pool } from "./pool.js";

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
  databasePool: Pool = pool,
): Promise<T> {
  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");

    const result = await operation(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Transaction rollback failed:", rollbackError);
    }

    throw error;
  } finally {
    client.release();
  }
}
