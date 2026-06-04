import type { Client } from "@discordjs/core";
import { GatewayDispatchEvents } from "@discordjs/core";
import { inviteCache } from "../inviteCache.js";
import { logger } from "../../lib/logger.js";

export function registerInviteCreateHandler(client: Client) {
  client.on(GatewayDispatchEvents.InviteCreate, ({ data }) => {
    if (!data.guild_id) return;
    inviteCache.set(data.guild_id, data.code, data.uses ?? 0);
    logger.debug({ code: data.code }, "Cached new invite");
  });
}
