import type { APIMessage } from "@discordjs/core";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";
import { db } from "@workspace/db";
import { blacklist } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

type Api = {
  channels: { createMessage: (id: string, opts: { content: string }) => Promise<unknown> };
  guilds: { unbanUser: (guildId: string, userId: string) => Promise<unknown> };
};

export async function handleUnbl(message: APIMessage, args: string[], api: Api) {
  const guildId = getEnv("FLUXER_GUILD_ID");
  const targetId = args[0]?.replace(/[<@!>]/g, "");
  if (!targetId) {
    await api.channels.createMessage(message.channel_id, { content: "❌ Usage: `+unbl <user_id>`" });
    return;
  }

  try {
    await api.guilds.unbanUser(guildId, targetId);

    await db
      .update(blacklist)
      .set({ active: false })
      .where(and(eq(blacklist.guildId, guildId), eq(blacklist.userId, targetId), eq(blacklist.active, true)));

    await api.channels.createMessage(message.channel_id, {
      content: `✅ <@${targetId}> has been **unblacklisted** and can rejoin the server.`,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to unban user");
    await api.channels.createMessage(message.channel_id, {
      content: `❌ Could not unblacklist that user. They may not be banned, or I lack **Ban Members** permission.`,
    });
  }
}
