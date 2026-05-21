import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, existingHash] = storedHash.split(":");

  if (!salt || !existingHash) {
    return false;
  }

  const providedHash = scryptSync(password, salt, KEY_LENGTH);
  const existingBuffer = Buffer.from(existingHash, "hex");

  if (providedHash.length !== existingBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedHash, existingBuffer);
}
