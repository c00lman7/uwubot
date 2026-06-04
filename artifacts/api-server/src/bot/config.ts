export const PREFIX = "+";

export const FLUXER_API = "https://api.fluxer.app";
export const FLUXER_API_VERSION = "1";

// Guild intents: Guilds | GuildMembers | GuildInvites | GuildMessages | MessageContent
export const INTENTS = 1 | 2 | 64 | 512 | 32768;

// Role hierarchy — higher index = higher rank
export const ROLE_HIERARCHY = [
  "everyone",
  "New Role",
  "Anti Pedo",
  "Third Division",
  "Second Division",
  "First Division",
  "Random",
  "xSploit",
  "VIP",
  "Known",
  "Friends",
  "Recruiter",
  "Lieutenant",
  "CO division Captain",
  "division Captain",
  "Alchemist",
  "Dark Mage",
  "Wizard",
  "OG Wizard",
  "Grand Wizard Master",
] as const;

// Minimum role name required to use staff commands
export const MIN_STAFF_ROLE = "Recruiter";

// Invite link patterns to detect
export const INVITE_PATTERNS = [
  /discord\.gg\/[a-zA-Z0-9]+/gi,
  /discord\.com\/invite\/[a-zA-Z0-9]+/gi,
  /fluxer\.app\/invite\/[a-zA-Z0-9]+/gi,
  /fluxer\.gg\/[a-zA-Z0-9]+/gi,
];

export function getEnv(key: string): string {
  return process.env[key] ?? "";
}

export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}
