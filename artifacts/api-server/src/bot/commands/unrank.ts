import type { APIMessage } from "@discordjs/core";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";

type Api = {
  channels: { createMessage: (id: string, opts: { content: string }) => Promise<unknown> };
  guilds: {
    getMember: (guildId: string, userId: string) => Promise<{ roles: string[] } | null>;
    getRoles: (guildId: string) => Promise<Array<{ id: string; name: string }>>;
    removeRoleFromMember: (guildId: string, userId: string, roleId: string) => Promise<unknown>;
  };
};

export async function handleUnrank(message: APIMessage, args: string[], api: Api) {
  const guildId = getEnv("FLUXER_GUILD_ID");
  const targetId = args[0]?.replace(/[<@!>]/g, "");

  if (!targetId) {
    await api.channels.createMessage(message.channel_id, {
      content: "Usage: `+unrank <@user>`",
    });
    return;
  }

  try {
    const [member, allRoles] = await Promise.all([
      api.guilds.getMember(guildId, targetId),
      api.guilds.getRoles(guildId),
    ]);

    if (!member) {
      await api.channels.createMessage(message.channel_id, {
        content: "Could not find that user in the server.",
      });
      return;
    }

    const randomRole = allRoles.find((r) => r.name.toLowerCase().includes("random"));
    const keepIds = new Set(randomRole ? [randomRole.id] : []);
    const toRemove = member.roles.filter((id) => !keepIds.has(id));

    await Promise.all(
      toRemove.map((roleId) =>
        api.guilds.removeRoleFromMember(guildId, targetId, roleId).catch((err) => {
          logger.warn({ err, roleId }, "Failed to remove role");
        })
      )
    );

    const keptText = randomRole ? ` (kept **${randomRole.name}**)` : "";
    await api.channels.createMessage(message.channel_id, {
      content: `Removed all roles from <@${targetId}>${keptText}.`,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to unrank user");
    await api.channels.createMessage(message.channel_id, {
      content: "Could not unrank that user. Make sure I have the **Manage Roles** permission.",
    });
  }
}
