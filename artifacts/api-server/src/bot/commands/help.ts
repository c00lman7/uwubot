import type { APIMessage } from "@discordjs/core";
import type { REST } from "@discordjs/rest";
import { PREFIX } from "../config.js";

export async function handleHelp(
  message: APIMessage,
  rest: REST,
  api: { channels: { createMessage: (id: string, opts: { content: string }) => Promise<unknown> } }
) {
  const content = [
    `\`${PREFIX}bl <user_id> [reason]\` — Ban a user`,
    `\`${PREFIX}unbl <user_id>\` — Unban a user`,
    `\`${PREFIX}kick <user_id> [reason]\` — Kick a user`,
    `\`${PREFIX}rank <@user> <@role>\` — Assign a role`,
    `\`${PREFIX}unrank <@user>\` — Remove all roles (keeps Random)`,
    `\`${PREFIX}ticket [topic]\` — Open a ticket`,
    `\`${PREFIX}ticket channel <#channel>\` — Send ticket panel to a channel`,
    `\`${PREFIX}close [reason]\` — Close the current ticket`,
    `\`${PREFIX}help\` — Show this message`,
  ].join("\n");

  await api.channels.createMessage(message.channel_id, { content });
}
