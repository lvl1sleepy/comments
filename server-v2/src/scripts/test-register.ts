import "dotenv/config";
import { pool } from "../db/pool.js";
import { registerUser } from "../services/auth.service.js";

async function main() {
  try {
    const user = await registerUser({
      username: "  testuser  ",
      email: "  TESTUSER@example.com  ",
      password: "TestPassword123!",
    });

    console.log("Created user:", user);
  } catch (error) {
    console.error("Registration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();
