import { Client } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { FLUXER_API, FLUXER_API_VERSION, INTENTS } from "./config.js";
import { registerReadyHandler } from "./handlers/ready.js";
import { registerMessageCreateHandler } from "./handlers/messageCreate.js";
import { registerGuildMemberAddHandler } from "./handlers/guildMemberAdd.js";
import { registerInviteCreateHandler } from "./handlers/inviteCreate.js";
import { registerInviteDeleteHandler } from "./handlers/inviteDelete.js";
import { registerInteractionCreateHandler } from "./handlers/interactionCreate.js";
import { logger } from "../lib/logger.js";

export function startBot(token: string) {
  logger.info("Starting Fluxer bot...");

  const rest = new REST({ api: FLUXER_API, version: FLUXER_API_VERSION }).setToken(token);

  const gateway = new WebSocketManager({
    intents: INTENTS,
    rest,
    token,
    version: FLUXER_API_VERSION,
  });

  const client = new Client({ rest, gateway });

  registerReadyHandler(client);
  registerMessageCreateHandler(client);
  registerGuildMemberAddHandler(client);
  registerInviteCreateHandler(client);
  registerInviteDeleteHandler(client);
  registerInteractionCreateHandler(client);

  gateway.connect().catch((err) => {
    logger.error({ err }, "Failed to connect to Fluxer gateway");
  });

  return client;
}
