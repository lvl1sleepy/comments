import "dotenv/config";
import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { setTimeout as sleep } from "node:timers/promises";
import { withTransaction } from "../db/transaction.js";

const url = process.env.TEST_DATABASE_URL;

// Safety guard: never run against comments_dev.
if (!url || new URL(url).pathname !== "/comments_test") {
  throw new Error("TEST_DATABASE_URL must point to comments_test");
}

const testPool = new Pool({
  connectionString: url,
});

// Create dedicated test tables.
before(async () => {
  await testPool.query(`
    CREATE TABLE IF NOT EXISTS it_parents (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  await testPool.query(`
    CREATE TABLE IF NOT EXISTS it_children (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      parent_id BIGINT NOT NULL REFERENCES it_parents(id),
      quantity INT NOT NULL CHECK (quantity > 0)
    )
  `);
});

// Reset test data before each test.
beforeEach(async () => {
  await testPool.query(`
    TRUNCATE it_children, it_parents RESTART IDENTITY
  `);
});

// Clean up test resources.
after(async () => {
  try {
    await testPool.query("DROP TABLE IF EXISTS it_children");
    await testPool.query("DROP TABLE IF EXISTS it_parents");
  } finally {
    await testPool.end();
  }
});

test("transaction commits both inserts", async () => {
  const parentId = await withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `
        INSERT INTO it_parents (name)
        VALUES ($1)
        RETURNING id
      `,
      ["Committed parent"],
    );

    const id = result.rows[0]!.id;

    await client.query(
      `
        INSERT INTO it_children (parent_id, quantity)
        VALUES ($1, $2)
      `,
      [id, 2],
    );

    return id;
  }, testPool);

  const parents = await testPool.query(
    "SELECT id FROM it_parents WHERE id = $1",
    [parentId],
  );

  const children = await testPool.query(
    "SELECT parent_id FROM it_children WHERE parent_id = $1",
    [parentId],
  );

  assert.equal(parents.rows.length, 1);
  assert.equal(children.rows.length, 1);
});

test("transaction rolls back after failure", async () => {
  await assert.rejects(
    withTransaction(async (client) => {
      await client.query("INSERT INTO it_parents (name) VALUES ($1)", [
        "Should be rolled back",
      ]);

      throw new Error("Simulated transaction failure");
    }, testPool),

    /Simulated transaction failure/,
  );

  const result = await testPool.query<{
    count: number;
  }>("SELECT COUNT(*)::int AS count FROM it_parents");

  assert.equal(result.rows[0]?.count, 0);
});

test("foreign key constraints reject invalid references", async () => {
  await assert.rejects(
    testPool.query(
      `
        INSERT INTO it_children (parent_id, quantity)
        VALUES ($1, $2)
      `,
      [999999, 1],
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503",
  );
});

test("check constraints reject invalid quantities", async () => {
  const parent = await testPool.query<{ id: string }>(
    `
      INSERT INTO it_parents (name)
      VALUES ($1)
      RETURNING id
    `,
    ["Constraint test"],
  );

  await assert.rejects(
    testPool.query(
      `
        INSERT INTO it_children (parent_id, quantity)
        VALUES ($1, $2)
      `,
      [parent.rows[0]!.id, -1],
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23514",
  );
});

test("SELECT FOR UPDATE serializes concurrent updates", async () => {
  // Create a parent and child in the test database.
  const parent = await testPool.query<{ id: string }>(
    "INSERT INTO it_parents (name) VALUES ($1) RETURNING id",
    ["Concurrency test"],
  );

  const child = await testPool.query<{ id: string }>(
    `
      INSERT INTO it_children (parent_id, quantity)
      VALUES ($1, 1)
      RETURNING id
    `,
    [parent.rows[0]!.id],
  );

  const childId = child.rows[0]!.id;

  // Two dedicated PostgreSQL connections.
  const clientA = await testPool.connect();
  const clientB = await testPool.connect();

  try {
    await clientA.query("BEGIN");
    await clientB.query("BEGIN");

    const pidA = (
      await clientA.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")
    ).rows[0]!.pid;

    const pidB = (
      await clientB.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")
    ).rows[0]!.pid;

    // A locks the child row.
    const locked = await clientA.query<{ quantity: number }>(
      `
        SELECT quantity
        FROM it_children
        WHERE id = $1
        FOR UPDATE
      `,
      [childId],
    );

    assert.equal(locked.rows[0]?.quantity, 1);

    // Prevent indefinite waiting if the test fails.
    await clientB.query("SET LOCAL lock_timeout = '15s'");

    // B attempts to update that same row.
    // Do not await it yet: it should block.
    const pendingB = clientB
      .query<{ quantity: number }>(
        `
          UPDATE it_children
          SET quantity = quantity + 1
          WHERE id = $1
          RETURNING quantity
        `,
        [childId],
      )
      .then(
        (result) => ({
          ok: true as const,
          quantity: result.rows[0]?.quantity,
        }),
        (error: unknown) => ({
          ok: false as const,
          error,
        }),
      );

    // Observe the actual PostgreSQL lock dependency.
    let blocked = false;

    for (let attempt = 0; attempt < 120; attempt++) {
      const status = await testPool.query<{
        is_blocked: boolean;
      }>(
        `
          SELECT $1::int = ANY(
            pg_blocking_pids($2::int)
          ) AS is_blocked
        `,
        [pidA, pidB],
      );

      if (status.rows[0]?.is_blocked) {
        blocked = true;
        break;
      }

      await sleep(25);
    }

    assert.equal(blocked, true, "Transaction B should be waiting for A's lock");

    // A increments while holding its row lock.
    const updatedA = await clientA.query<{
      quantity: number;
    }>(
      `
        UPDATE it_children
        SET quantity = quantity + 1
        WHERE id = $1
        RETURNING quantity
      `,
      [childId],
    );

    assert.equal(updatedA.rows[0]?.quantity, 2);

    // A commits, releasing its lock.
    await clientA.query("COMMIT");

    // B should now finish its increment.
    const resultB = await pendingB;

    if (!resultB.ok) {
      throw resultB.error;
    }

    assert.equal(resultB.quantity, 3);

    await clientB.query("COMMIT");

    // Verify the final persisted value.
    const finalResult = await testPool.query<{
      quantity: number;
    }>("SELECT quantity FROM it_children WHERE id = $1", [childId]);

    assert.equal(finalResult.rows[0]?.quantity, 3);
  } finally {
    // Safe even if a transaction has already committed.
    await clientA.query("ROLLBACK").catch(() => {});
    await clientB.query("ROLLBACK").catch(() => {});

    clientA.release();
    clientB.release();
  }
});
