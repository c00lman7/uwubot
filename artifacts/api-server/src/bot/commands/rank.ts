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
  const roleName = args.slice(1).join(" ");

  if (!targetId || !roleName) {
    await api.channels.createMessage(message.channel_id, {
      content: "❌ Usage: `+rank <user_id> <role name>`",
    });
    return;
  }

  try {
    const roles = await api.guilds.getRoles(guildId);
    const role = roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase());

    if (!role) {
      const roleList = roles.map((r) => `\`${r.name}\``).join(", ");
      await api.channels.createMessage(message.channel_id, {
        content: `❌ Role \`${roleName}\` not found.\nAvailable roles: ${roleList}`,
      });
      return;
    }

    await api.guilds.addRoleToMember(guildId, targetId, role.id);
    await api.channels.createMessage(message.channel_id, {
      content: `✅ <@${targetId}> has been given the **${role.name}** role.`,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to assign role");
    await api.channels.createMessage(message.channel_id, {
      content: `❌ Could not assign that role. Make sure I have the **Manage Roles** permission and that my role is above the target role.`,
    });
  }
}
