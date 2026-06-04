// In-memory invite cache: guildId -> Map<code, uses>
const cache = new Map<string, Map<string, number>>();

export const inviteCache = {
  set(guildId: string, code: string, uses: number) {
    if (!cache.has(guildId)) cache.set(guildId, new Map());
    cache.get(guildId)!.set(code, uses);
  },

  get(guildId: string): Map<string, number> {
    return cache.get(guildId) ?? new Map();
  },

  loadGuild(guildId: string, invites: Array<{ code: string; uses: number | null }>) {
    const m = new Map<string, number>();
    for (const inv of invites) {
      m.set(inv.code, inv.uses ?? 0);
    }
    cache.set(guildId, m);
  },

  remove(guildId: string, code: string) {
    cache.get(guildId)?.delete(code);
  },

  /** Compare old cache to fresh invites and return the code that gained a use */
  diff(
    guildId: string,
    freshInvites: Array<{ code: string; uses: number | null; inviter?: { id: string } | null }>
  ): { code: string; inviterId: string | null } | null {
    const old = cache.get(guildId) ?? new Map();
    for (const inv of freshInvites) {
      const freshUses = inv.uses ?? 0;
      const oldUses = old.get(inv.code) ?? 0;
      if (freshUses > oldUses) {
        return { code: inv.code, inviterId: inv.inviter?.id ?? null };
      }
    }
    // Vanity or unknown
    return null;
  },
};
