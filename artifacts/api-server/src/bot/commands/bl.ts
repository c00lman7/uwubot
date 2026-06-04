import type { APIMessage } from "@discordjs/core";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";
import { db } from "@workspace/db";
import { blacklist } from "@workspace/db/schema";

type Api = {
  channels: { createMessage: (id: string, opts: { content: string }) => Promise<unknown> };
  guilds: { banUser: (guildId: string, userId: string, opts: { reason?: string }) => Promise<unknown> };
};

export async function handleBl(message: APIMessage, args: string[], api: Api) {
  const guildId = getEnv("FLUXER_GUILD_ID");
  const targetId = args[0]?.replace(/[<@!>]/g, "");
  if (!targetId) {
    await api.channels.createMessage(message.channel_id, { content: "Usage: `+bl <user_id> [reason]`" });
    return;
  }

  const reason = args.slice(1).join(" ") || "No reason provided";

  try {
    await api.guilds.banUser(guildId, targetId, { reason });

    await db.insert(blacklist).values({
      guildId,
      userId: targetId,
      reason,
      moderatorId: message.author.id,
    });

    await api.channels.createMessage(message.channel_id, {
      content: `<@${targetId}> has been blacklisted. Reason: ${reason}`,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to ban user");
    await api.channels.createMessage(message.channel_id, {
      content: "Could not blacklist that user. Make sure I have the **Ban Members** permission and the user is in the server.",
    });
  }
}
