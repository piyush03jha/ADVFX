import { createHmac, randomBytes } from "node:crypto";

export const AUTH_COOKIE_NAME = "forma_session";
export const AUTH_SECRET_ENV = "AUTH_SECRET";
export const RETURN_TO_PARAM = "returnTo";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

function getAuthSecret() {
  const secret = process.env[AUTH_SECRET_ENV];

  if (!secret) {
    throw new Error("AUTH_SECRET is required for authentication.");
  }

  return secret;
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = createHmac("sha256", getAuthSecret()).update(`${salt}:${password}`).digest("hex");
  return `${salt}.${digest}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, expected] = passwordHash.split(".");

  if (!salt || !expected) return false;

  const actual = createHmac("sha256", getAuthSecret()).update(`${salt}:${password}`).digest("hex");
  return actual === expected;
}

export function createSessionToken(user: AuthUser) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      iat: Date.now(),
    }),
    "utf8",
  ).toString("base64url");

  const signature = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) return null;

  const expectedSignature = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");

  if (signature !== expectedSignature) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      name?: string;
      email?: string;
    };

    if (!parsed.sub || !parsed.name || !parsed.email) return null;

    return { id: parsed.sub, name: parsed.name, email: parsed.email };
  } catch {
    return null;
  }
}
