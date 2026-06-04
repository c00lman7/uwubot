import type { Client } from "@discordjs/core";
import { GatewayDispatchEvents } from "@discordjs/core";
import { inviteCache } from "../inviteCache.js";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";
import { db } from "@workspace/db";
import { inviteStats, invitedBy } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export function registerGuildMemberAddHandler(client: Client) {
  client.on(GatewayDispatchEvents.GuildMemberAdd, async ({ api, data }) => {
    const guildId = data.guild_id;
    const userId = data.user?.id;
    if (!userId) return;

    const username = data.user?.username ?? "Unknown";

    // ── Auto-role ──────────────────────────────────────────────────────────────
    const autoRoleId = getEnv("AUTO_ROLE_ID");
    if (autoRoleId) {
      try {
        await api.guilds.addRoleToMember(guildId, userId, autoRoleId);
      } catch (err) {
        logger.warn({ err, userId }, "Failed to assign auto-role");
      }
    }

    // ── Welcome message ────────────────────────────────────────────────────────
    const welcomeChannelId = getEnv("WELCOME_CHANNEL_ID");
    if (welcomeChannelId) {
      try {
        await api.channels.createMessage(welcomeChannelId, {
          content: `👋 Welcome to the server, <@${userId}>! Make sure to read the rules.`,
        });
      } catch (err) {
        logger.warn({ err }, "Failed to send welcome message");
      }
    }

    // ── Invite tracking ────────────────────────────────────────────────────────
    const inviteLogChannelId = getEnv("INVITE_LOG_CHANNEL_ID");
    if (!inviteLogChannelId) return;

    try {
      const freshInvites = await api.guilds.getInvites(guildId);
      const result = inviteCache.diff(
        guildId,
        freshInvites as Array<{ code: string; uses: number | null; inviter?: { id: string } | null }>
      );

      // Refresh cache with latest counts
      inviteCache.loadGuild(
        guildId,
        freshInvites as Array<{ code: string; uses: number | null; inviter?: { id: string } | null }>
      );

      const inviterId = result?.inviterId ?? null;
      const inviteCode = result?.code ?? null;

      // Persist who invited this user
      await db.insert(invitedBy).values({
        guildId,
        userId,
        inviterId,
        inviteCode,
      });

      let inviterMention = "an unknown link";
      let totalInvites = 0;

      if (inviterId) {
        inviterMention = `<@${inviterId}>`;

        // Upsert invite stats for the inviter
        const existing = await db
          .select()
          .from(inviteStats)
          .where(and(eq(inviteStats.guildId, guildId), eq(inviteStats.inviterId, inviterId)))
          .limit(1);

        if (existing.length > 0) {
          const updated = await db
            .update(inviteStats)
            .set({ totalInvited: existing[0]!.totalInvited + 1, updatedAt: new Date() })
            .where(eq(inviteStats.id, existing[0]!.id))
            .returning();
          totalInvites = updated[0]?.totalInvited ?? 0;
        } else {
          const inserted = await db
            .insert(inviteStats)
            .values({ guildId, inviterId, inviteCode: inviteCode ?? "", totalInvited: 1 })
            .returning();
          totalInvites = inserted[0]?.totalInvited ?? 1;
        }
      }

      const msg = inviterId
        ? `📥 **${username}** was invited by ${inviterMention}. They now have **${totalInvites}** invite${totalInvites === 1 ? "" : "s"}!`
        : `📥 **${username}** joined the server (invite source unknown).`;

      await api.channels.createMessage(inviteLogChannelId, { content: msg });
    } catch (err) {
      logger.warn({ err }, "Error during invite tracking");
    }
  });
}
