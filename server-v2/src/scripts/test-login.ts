import "dotenv/config";
import { pool } from "../db/pool.js";
import { loginUser } from "../services/auth.service.js";
import { verifyAccessToken } from "../auth/token.js";

async function main() {
  try {
    const result = await loginUser({
      email: "testuser@example.com",
      password: "TestPassword123!",
    });

    const verifiedUserId = await verifyAccessToken(result.accessToken);

    console.log("Login successful:", true);
    console.log("JWT user ID matches:", verifiedUserId === result.user.id);
    console.log("Password hash exposed:", "password_hash" in result.user);
  } catch (error) {
    console.error("Login failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();
