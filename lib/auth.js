import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "library_session";

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(derived, Buffer.from(key, "hex"));
}

export function createSession(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", process.env.AUTH_SECRET || "development-only-change-me").update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSession(token) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", process.env.AUTH_SECRET || "development-only-change-me").update(payload).digest("base64url");
  if (signature !== expected) return null;
  let session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  return session.exp > Date.now() ? session : null;
}
