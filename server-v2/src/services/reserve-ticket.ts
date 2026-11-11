import { withTransaction } from "../db/transaction.js";

export async function reserveTicket(inventoryId: number): Promise<boolean> {
  return withTransaction(async (client) => {
    // Step 1: Lock the inventory row.
    const result = await client.query<{
      remaining: number;
    }>(
      `
        SELECT remaining
        FROM inventory_demo
        WHERE id = $1
        FOR UPDATE
      `,
      [inventoryId],
    );

    if (result.rows.length === 0) {
      throw new Error("Inventory not found");
    }

    const remaining = result.rows[0]!.remaining;

    // Step 2: Check availability while holding the lock.
    if (remaining === 0) {
      return false;
    }

    // Step 3: Decrease available inventory.
    await client.query(
      `
        UPDATE inventory_demo
        SET remaining = remaining - 1
        WHERE id = $1
      `,
      [inventoryId],
    );

    // Step 4: Create the reservation.
    await client.query(
      `
        INSERT INTO reservations_demo (inventory_id)
        VALUES ($1)
      `,
      [inventoryId],
    );

    return true;
  });
}
