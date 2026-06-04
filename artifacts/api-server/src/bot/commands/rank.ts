import type { APIMessage } from "@discordjs/core";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";

type Api = {
  channels: { createMessage: (id: string, opts: { content: string }) => Promise<unknown> };
  guilds: {
    getRoles: (guildId: string) => Promise<Array<{ id: string; name: string }>>;
    addRoleToMember: (guildId: string, userId: string, roleId: string) => Promise<unknown>;
  };
};

export async function handleRank(message: APIMessage, args: string[], api: Api) {
  const guildId = getEnv("FLUXER_GUILD_ID");
  const targetId = args[0]?.replace(/[<@!>]/g, "");
  const roleArg = args[1];

  if (!targetId || !roleArg) {
    await api.channels.createMessage(message.channel_id, {
      content: "Usage: `+rank <@user> <@role>`",
    });
    return;
  }

  const roleMentionMatch = roleArg.match(/^<@&(\d+)>$/) ?? roleArg.match(/^(\d+)$/);
  if (!roleMentionMatch) {
    await api.channels.createMessage(message.channel_id, {
      content: "Please mention a role directly: `+rank <@user> @role`",
    });
    return;
  }

  const roleId = roleMentionMatch[1]!;

  try {
    await api.guilds.addRoleToMember(guildId, targetId, roleId);
    await api.channels.createMessage(message.channel_id, {
      content: `<@${targetId}> has been given <@&${roleId}>.`,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to assign role");
    await api.channels.createMessage(message.channel_id, {
      content: "Could not assign that role. Make sure I have the **Manage Roles** permission and my role is above the target role.",
    });
  }
}
