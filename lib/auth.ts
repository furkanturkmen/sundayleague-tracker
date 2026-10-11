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

function secret(): string {
  const s = process.env.SESSION_SECRET ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!s) throw new Error("SESSION_SECRET is not set.");
  return s;
}

const cookieName = (clubId: string) => `club_${clubId.replace(/-/g, "")}`;

/** The signature covers the password hash, so changing the password signs everyone out. */
function sign(clubId: string, passwordHash: string, expires: number): string {
  return createHmac("sha256", secret()).update(`${clubId}.${expires}.${passwordHash}`).digest("base64url");
}

export async function startSession(clubId: string, passwordHash: string): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const jar = await cookies();
  jar.set(cookieName(clubId), `${expires}.${sign(clubId, passwordHash, expires)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession(clubId: string): Promise<void> {
  (await cookies()).delete(cookieName(clubId));
}

export async function hasSession(clubId: string, passwordHash: string): Promise<boolean> {
  const value = (await cookies()).get(cookieName(clubId))?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  const expires = Number(exp);
  if (!sig || !Number.isFinite(expires) || expires < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(clubId, passwordHash, expires));
  return a.length === b.length && timingSafeEqual(a, b);
}

