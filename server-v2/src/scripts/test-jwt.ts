import "dotenv/config";
import { signAccessToken, verifyAccessToken } from "../auth/token.js";

async function main() {
  // Test 1: Valid JWT
  const token = await signAccessToken("1");
  const userId = await verifyAccessToken(token);

  console.log("Verified User ID:", userId);

  // Test 2: Invalid JWT
  try {
    await verifyAccessToken("invalid.jwt.token");
    console.error("Unexpected: invalid token was accepted");
    process.exitCode = 1;
  } catch (error) {
    console.log(
      "Invalid token rejected:",
      error instanceof Error ? error.name : "Unknown error",
    );
  }
}

await main();
