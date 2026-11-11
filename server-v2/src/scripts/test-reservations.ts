import "dotenv/config";
import assert from "node:assert/strict";

import { pool } from "../db/pool.js";
import { reserveTicket } from "../services/reserve-ticket.js";

async function main() {
  // Reset demo data.
  await pool.query("DELETE FROM reservations_demo");

  await pool.query(`
    UPDATE inventory_demo
    SET remaining = 1
    WHERE id = 1
  `);

  // Simulate two users reserving concurrently.
  const results = await Promise.all([reserveTicket(1), reserveTicket(1)]);

  console.log("Reservation results:", results);

  // Exactly one request should succeed.
  assert.equal(results.filter((result) => result).length, 1);

  // Check the final inventory.
  const inventory = await pool.query<{
    remaining: number;
  }>("SELECT remaining FROM inventory_demo WHERE id = 1");

  assert.equal(inventory.rows[0]?.remaining, 0);

  // Check how many reservations were created.
  const reservations = await pool.query<{
    count: number;
  }>(
    `
      SELECT COUNT(*)::int AS count
      FROM reservations_demo
      WHERE inventory_id = 1
    `,
  );

  assert.equal(reservations.rows[0]?.count, 1);

  console.log("PASS: No overselling occurred.");
}

try {
  await main();
} finally {
  await pool.end();
}
