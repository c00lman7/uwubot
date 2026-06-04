import type { Client } from "@discordjs/core";
import { GatewayDispatchEvents } from "@discordjs/core";
import { inviteCache } from "../inviteCache.js";
import { logger } from "../../lib/logger.js";

export function registerInviteDeleteHandler(client: Client) {
  client.on(GatewayDispatchEvents.InviteDelete, ({ data }) => {
    if (!data.guild_id) return;
    inviteCache.remove(data.guild_id, data.code);
    logger.debug({ code: data.code }, "Removed deleted invite from cache");
  });
}
