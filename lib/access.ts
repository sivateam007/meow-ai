/**
 * Admin-email helper, kept dependency-free so it can be imported from anywhere
 * without dragging in Prisma or Next.js runtime APIs.
 */

export function isAdminEmail(email: string): boolean {
  const admins = process.env.MEOW_AI_ADMIN_EMAILS;
  if (!admins) return false;
  return admins
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}
