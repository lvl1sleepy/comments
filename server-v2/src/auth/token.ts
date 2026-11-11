import "dotenv/config";
import { SignJWT, jwtVerify } from "jose";
import { AppError } from "../errors/app-error.js";

const secretHex = process.env.JWT_SECRET;

if (!secretHex || !/^[0-9a-fA-F]{64}$/.test(secretHex)) {
  throw new Error("JWT_SECRET must contain 32 random bytes encoded as hex");
}

const secret = Buffer.from(secretHex, "hex");

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("comments-api")
    .setAudience("comments-web")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
    issuer: "comments-api",
    audience: "comments-web",
  });

  if (
    typeof payload.sub !== "string" ||
    !/^[1-9]\d*$/.test(payload.sub) ||
    typeof payload.exp !== "number"
  ) {
    throw new AppError("INVALID_TOKEN", "Invalid access token");
  }

  return payload.sub;
}
