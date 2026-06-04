import type { APIMessage } from "@discordjs/core";
import type { REST } from "@discordjs/rest";
import { PREFIX } from "../config.js";

export async function handleHelp(
  message: APIMessage,
  rest: REST,
  api: { channels: { createMessage: (id: string, opts: { content: string }) => Promise<unknown> } }
) {
  const content = [
    "**📋 Fluxer Bot Commands** *(Recruiter+ only unless noted)*",
    "",
    `\`${PREFIX}bl <user_id> [reason]\` — Blacklist (ban) a user`,
    `\`${PREFIX}unbl <user_id>\` — Remove a blacklist (unban)`,
    `\`${PREFIX}kick <user_id> [reason]\` — Kick a user`,
    `\`${PREFIX}rank <@user> <@role>\` — Assign a role to a user`,
    `\`${PREFIX}unrank <@user>\` — Remove all roles (keeps Random)`,
    `\`${PREFIX}ticket [topic]\` — Open a support ticket *(everyone)*`,
    `\`${PREFIX}ticket channel <#channel>\` — Send a ticket panel embed to a channel`,
    `\`${PREFIX}close [reason]\` — Close the current ticket channel`,
    `\`${PREFIX}help\` — Show this message`,
  ].join("\n");

  await api.channels.createMessage(message.channel_id, { content });
}
