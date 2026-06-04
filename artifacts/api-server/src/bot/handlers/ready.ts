import type { Client } from "@discordjs/core";
import { GatewayDispatchEvents } from "@discordjs/core";
import { inviteCache } from "../inviteCache.js";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";

export function registerReadyHandler(client: Client) {
  client.on(GatewayDispatchEvents.Ready, async ({ api, data }) => {
    logger.info({ tag: `${data.user.username}#${data.user.discriminator}` }, "Fluxer bot is online");

    const guildId = getEnv("FLUXER_GUILD_ID");
    if (!guildId) {
      logger.warn("FLUXER_GUILD_ID not set — invite tracking disabled");
      return;
    }

    try {
      const invites = await api.guilds.getInvites(guildId);
      inviteCache.loadGuild(guildId, invites as Array<{ code: string; uses: number | null; inviter?: { id: string } | null }>);
      logger.info({ count: invites.length }, "Invite cache populated");
    } catch (err) {
      logger.warn({ err }, "Could not load guild invites — check MANAGE_GUILD permission");
    }
  });
}
