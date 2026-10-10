import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Single-secret sign-in.
 *
 * This app is used by exactly one person, so it does not have accounts: the
 * whole invite-only apparatus (allow-lists, pending/revoked rows, approval
 * emails) existed to manage strangers and is now gone. Instead there is one
 * shared secret in `MEOW_LOGIN_SECRET`.
 *
 * Two formats are accepted in that variable:
 *
 *   plaintext            "correct horse battery staple"
 *                        Convenient. Compare via SHA-256, then a constant-time
 *                        compare, so the length of the secret never leaks
 *                        through a timing difference.
 *
 *   scrypt$<salt>$<hash> Produced by `npm run secret`. If the environment is
 *                        ever disclosed, an attacker only gets a slow-hash
 *                        target instead of the passphrase itself.
 *
 * Constant-time comparison matters: a naive `===` returns early at the first
 * differing byte, which leaks how many leading characters were correct and lets
 * an attacker recover a secret one character at a time. Every branch here is
 * length-independent before `timingSafeEqual` is reached.
 */

export const MIN_SECRET_LENGTH = 8;
const MIN_SCRYPT_HASH_LENGTH = 64;

export type SecretCheck =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "mismatch" };

/**
 * Returns the configured secret, or null when it is missing or too short to be
 * safe. A short secret is treated as unconfigured rather than merely weak so
 * that a half-filled config can never silently become the live login.
 */
function configuredSecret(): string | null {
  const secret = process.env.MEOW_LOGIN_SECRET;
  if (!secret) return null;
  if (secret.startsWith("scrypt$")) {
    return secret.length > MIN_SCRYPT_HASH_LENGTH ? secret : null;
  }
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Verifies a candidate against an `scrypt$salt$hash` formatted secret.
 *
 * Returns "malformed" for a structurally broken value so the caller can report
 * a configuration problem rather than blaming the user's password.
 */
function verifyScrypt(secret: string, candidate: string): boolean | "malformed" {
  const parts = secret.split("$");
  if (parts.length !== 3) return "malformed";

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length === 0 || expected.length === 0) return "malformed";

  let actual: Buffer;
  try {
    actual = scryptSync(candidate, salt, expected.length);
  } catch {
    return "malformed";
  }

  return timingSafeEqual(actual, expected);
}

/**
 * Verifies a submitted password.
 *
 * Never throws, so a caller can treat every failure the same way. "unconfigured"
 * is kept distinct from "mismatch" because a server without a configured secret
 * should say so rather than reject every attempt with a misleading message.
 */
export function verifyLoginSecret(candidate: unknown): SecretCheck {
  const secret = configuredSecret();
  if (!secret) return { ok: false, reason: "unconfigured" };

  if (typeof candidate !== "string" || candidate.length === 0) {
    return { ok: false, reason: "mismatch" };
  }

  if (secret.startsWith("scrypt$")) {
    const result = verifyScrypt(secret, candidate);
    // A broken value in the environment is a configuration fault, not a wrong
    // password — surface it as such instead of telling the user to retype.
    if (result === "malformed") return { ok: false, reason: "unconfigured" };
    return result ? { ok: true } : { ok: false, reason: "mismatch" };
  }

  return timingSafeEqual(digest(secret), digest(candidate))
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}

/** The identity the session cookie carries. Chat history is keyed off this. */
export interface LoginIdentity {
  email: string;
  name: string;
  /** Always empty: there is no avatar without an identity provider. */
  image: string;
}

function firstAdminEmail(): string {
  const admins = process.env.MEOW_AI_ADMIN_EMAILS;
  if (!admins) return "";
  return (
    admins
      .split(",")
      .map((e) => e.trim())
      .find(Boolean) || ""
  );
}

/**
 * Builds the fixed identity used for every sign-in.
 *
 * `MEOW_LOGIN_EMAIL` wins; otherwise it falls back to the first admin email so
 * that an app configured only with `MEOW_AI_ADMIN_EMAILS` still keeps its chat
 * history under the expected address.
 */
export function loginIdentity(): LoginIdentity {
  const email =
    process.env.MEOW_LOGIN_EMAIL?.trim() || firstAdminEmail() || "meow@localhost";

  return {
    email: email.toLowerCase(),
    name: process.env.MEOW_LOGIN_NAME?.trim() || "Meow",
    image: "",
  };
}

/** Generates a strong passphrase and its `scrypt$…` counterpart for the env. */
export function generateLoginSecret(): { passphrase: string; hashed: string } {
  const passphrase = randomBytes(18).toString("base64url");
  const salt = randomBytes(16);
  const hash = scryptSync(passphrase, salt, 64);
  return {
    passphrase,
    hashed: `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`,
  };
}
