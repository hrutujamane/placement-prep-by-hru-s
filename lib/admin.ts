export const ADMIN_EMAILS = new Set([
  "hrutujamane492@gmail.com",
]);

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.has(email.trim().toLowerCase()));
}
