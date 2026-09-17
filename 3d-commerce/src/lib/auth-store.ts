import type { AuthUser } from "./auth";

const users = new Map<string, { user: AuthUser; passwordHash: string }>();

export function findUserByEmail(email: string) {
  return users.get(email.trim().toLowerCase()) ?? null;
}

export function findUserById(id: string) {
  for (const record of users.values()) {
    if (record.user.id === id) return record.user;
  }

  return null;
}

export function createUser({ name, email, passwordHash }: { name: string; email: string; passwordHash: string }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user: AuthUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
  };

  users.set(normalizedEmail, { user, passwordHash });
  return user;
}
