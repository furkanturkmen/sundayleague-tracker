import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SESSION_DAYS = 90;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(key, expected);
}

// No 0/O or 1/I/L, so a code copied off a screen or paper reads back the same.
const CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A recovery code like "K7QM-3XTP-9RWA-FHN2": 16 random characters, about 79 bits. */
export function newRecoveryCode(): string {
  const chars = [...randomBytes(16)].map((b) => CODE_LETTERS[b % CODE_LETTERS.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

/** The code as typed, without dashes, spaces or case, so "k7qm 3xtp…" matches "K7QM-3XTP-…". */
export const normaliseCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function serverSecret(): string {
  const s = process.env.SESSION_SECRET ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return s;
}

/**
 * Admins can change anything; the coach only sets line-ups; the squad can only view a private club. Each has its own
 * password and cookie.
 */
export type Role = "admin" | "coach" | "squad";

const cookieName = (clubId: string, role: Role) => `${role === "admin" ? "club" : role}_${clubId.replace(/-/g, "")}`;

/** The signature covers the password hash, so changing the password signs everyone out. */
function sign(clubId: string, passwordHash: string, expires: number, role: Role): string {
  const data = `${role === "admin" ? "" : `${role}.`}${clubId}.${expires}.${passwordHash}`;
  return createHmac("sha256", serverSecret()).update(data).digest("base64url");
}

export async function startSession(clubId: string, passwordHash: string, role: Role = "admin"): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const jar = await cookies();
  jar.set(cookieName(clubId, role), `${expires}.${sign(clubId, passwordHash, expires, role)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession(clubId: string, role: Role = "admin"): Promise<void> {
  (await cookies()).delete(cookieName(clubId, role));
}

export async function hasSession(clubId: string, passwordHash: string, role: Role = "admin"): Promise<boolean> {
  const value = (await cookies()).get(cookieName(clubId, role))?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  const expires = Number(exp);
  if (!sig || !Number.isFinite(expires) || expires < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(clubId, passwordHash, expires, role));
  return a.length === b.length && timingSafeEqual(a, b);
}

