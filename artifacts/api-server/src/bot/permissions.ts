const MIN_STAFF_ROLE_NAME = (process.env["MIN_STAFF_ROLE"] ?? "Recruiter").toLowerCase();

export interface GuildRole {
  id: string;
  name: string;
  position: number;
}

/**
 * Given all guild roles and the member's role IDs, return true if the member
 * has a role at or above the minimum staff role (Recruiter by default).
 * Uses role position — no hardcoded name matching.
 */
export function isStaff(allRoles: GuildRole[], memberRoleIds: string[]): boolean {
  const staffRole = allRoles.find((r) => r.name.toLowerCase() === MIN_STAFF_ROLE_NAME);
  if (!staffRole) return false;

  const memberRoles = allRoles.filter((r) => memberRoleIds.includes(r.id));
  return memberRoles.some((r) => r.position >= staffRole.position);
}

/**
 * Returns true if the member has a role above Lieutenant (position-based).
 * Admins can post invite links freely.
 */
export function isAdmin(allRoles: GuildRole[], memberRoleIds: string[]): boolean {
  const adminRole = allRoles.find((r) => r.name.toLowerCase() === "lieutenant");
  if (!adminRole) return false;

  const memberRoles = allRoles.filter((r) => memberRoleIds.includes(r.id));
  return memberRoles.some((r) => r.position >= adminRole.position);
}
