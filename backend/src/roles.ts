export const roles = ["admin", "editor", "user"] as const;

export type Role = (typeof roles)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

export function canManageQuestions(role: Role) {
  return role === "admin" || role === "editor";
}

export function canManageAccounts(role: Role) {
  return role === "admin";
}
