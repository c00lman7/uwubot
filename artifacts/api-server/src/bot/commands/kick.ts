import type { APIMessage } from "@discordjs/core";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";

type Api = {
  channels: { createMessage: (id: string, opts: { content: string }) => Promise<unknown> };
  guilds: { removeMember: (guildId: string, userId: string, opts?: { reason?: string }) => Promise<unknown> };
};

export async function handleKick(message: APIMessage, args: string[], api: Api) {
  const guildId = getEnv("FLUXER_GUILD_ID");
  const targetId = args[0]?.replace(/[<@!>]/g, "");
  if (!targetId) {
    await api.channels.createMessage(message.channel_id, { content: "Usage: `+kick <user_id> [reason]`" });
    return;
  }

  const reason = args.slice(1).join(" ") || "No reason provided";

  try {
    await api.guilds.removeMember(guildId, targetId, { reason });
    await api.channels.createMessage(message.channel_id, {
      content: `<@${targetId}> has been kicked. Reason: ${reason}`,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to kick user");
    await api.channels.createMessage(message.channel_id, {
      content: "Could not kick that user. Make sure I have the **Kick Members** permission and the user is in the server.",
    });
  }
}
