import { hashPassword, verifyPassword } from "../auth/password.js";
import { AppError } from "../errors/app-error.js";
import {
  createUser,
  findUserByEmail,
  type UserRow,
} from "../repositories/user.repository.js";
import { isPostgresError } from "../db/postgres-error.js";
import { signAccessToken } from "../auth/token.js";

export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: UserRow;
  accessToken: string;
}

export async function registerUser(input: RegisterUserInput): Promise<UserRow> {
  const trimmedUsername = input.username.trim();
  const trimmedEmail = input.email.trim().toLowerCase();

  if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
    throw new AppError(
      "INVALID_USERNAME",
      "Username should be 3-50 characters long",
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    throw new AppError("INVALID_EMAIL", "Email should be valid");
  }

  if (input.password.length < 8) {
    throw new AppError(
      "INVALID_PASSWORD",
      "Password should be at least 8 characters long",
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await createUser({
      username: trimmedUsername,
      email: trimmedEmail,
      passwordHash,
    });
  } catch (error: unknown) {
    if (isPostgresError(error) && error.code === "23505") {
      throw new AppError(
        "REGISTRATION_CONFLICT",
        "Username or email is already registered",
      );
    }
    throw error;
  }
}

export async function loginUser(input: LoginUserInput): Promise<LoginResult> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password");
  }

  const isPasswordValid = await verifyPassword(
    input.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password");
  }

  const token = await signAccessToken(user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    accessToken: token,
  };
}
