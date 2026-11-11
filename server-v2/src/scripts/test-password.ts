import { hashPassword, verifyPassword } from "../auth/password.js";

const password = "TestPassword-123!";

const hash1 = await hashPassword(password);
const hash2 = await hashPassword(password);

console.log("Same hash?", hash1 === hash2);

console.log("Correct password:", await verifyPassword(password, hash1));

console.log(
  "Incorrect password:",
  await verifyPassword("WrongPassword", hash1),
);
