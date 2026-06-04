import { ROLE_HIERARCHY, MIN_STAFF_ROLE } from "./config.js";

/** Returns the hierarchy index for a role name (higher = more powerful) */
function rankIndex(roleName: string): number {
  const idx = ROLE_HIERARCHY.indexOf(roleName as (typeof ROLE_HIERARCHY)[number]);
  return idx === -1 ? 0 : idx;
}

const minStaffIndex = rankIndex(MIN_STAFF_ROLE);

/**
 * Given a list of role names a member has, return true if they have
 * at least the minimum staff rank (Recruiter or above).
 */
export function isStaff(memberRoleNames: string[]): boolean {
  return memberRoleNames.some((name) => rankIndex(name) >= minStaffIndex);
}

/**
 * Given a list of role names a member has, return true if they have
 * any of the top admin roles (Lieutenant and above).
 */
export function isAdmin(memberRoleNames: string[]): boolean {
  const lieutenantIndex = rankIndex("Lieutenant");
  return memberRoleNames.some((name) => rankIndex(name) >= lieutenantIndex);
}
