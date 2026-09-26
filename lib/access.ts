/**
 * Email allow-list helpers.
 *
 * Kept dependency-free on purpose: both `lib/auth.ts` (Node, uses Prisma) and
 * `lib/admin.ts` (Node, uses Prisma) need these. Putting them here means the
 * two never have to import each other, which previously created an import cycle.
 */

export function isAdminEmail(email: string): boolean {
  const admins = process.env.MEOW_AI_ADMIN_EMAILS;
  if (!admins) return false;
  return admins
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export function isAllowedEmail(email: string): boolean {
  const allowed = process.env.MEOW_AI_ALLOWED_EMAILS;
  if (!allowed) return false;
  return allowed
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}
