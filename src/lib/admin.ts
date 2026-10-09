// Server-only configuration. Never expose the configured email in a client bundle.
export const MAX_USERS = 50;

export function isAdminEmail(email: string) {
  const configured = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!configured && email.trim().toLowerCase() === configured;
}
