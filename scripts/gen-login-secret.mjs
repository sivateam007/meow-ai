#!/usr/bin/env node
/**
 * Generates a login secret for MEOW_LOGIN_SECRET.
 *
 * Self-contained on purpose: it only needs node:crypto, so it runs before
 * `npm install` has ever succeeded on a fresh machine.
 *
 *   npm run secret
 *
 * Paste the first line straight into MEOW_LOGIN_SECRET, or paste the second
 * (the scrypt form) if you would rather not store the passphrase itself.
 */
import { randomBytes, scryptSync } from "node:crypto";

function generate() {
  const passphrase = randomBytes(18).toString("base64url");
  const salt = randomBytes(16);
  const hash = scryptSync(passphrase, salt, 64);
  return { passphrase, hashed: `scrypt$${salt.toString("hex")}$${hash.toString("hex")}` };
}

const { passphrase, hashed } = generate();

console.log("MEOW_LOGIN_SECRET=" + passphrase);
console.log("");
console.log("Or store the hashed form instead (same secret, slow to crack if leaked):");
console.log("MEOW_LOGIN_SECRET=" + hashed);
console.log("");
console.log("Minimum accepted length is 8 characters; 16+ is recommended.");
