import type { APIMessage } from "@discordjs/core";
import { logger } from "../../lib/logger.js";

type Api = {
  channels: {
    createMessage: (id: string, opts: Record<string, unknown>) => Promise<unknown>;
  };
};

export async function handleTicketPanel(message: APIMessage, args: string[], api: Api) {
  const chanArg = args[0];
  const channelIdMatch = chanArg?.match(/^<#(\d+)>$/) ?? chanArg?.match(/^(\d+)$/);

  if (!channelIdMatch) {
    await api.channels.createMessage(message.channel_id, {
      content: "Usage: `+ticket channel <#channel>`",
    });
    return;
  }

  const targetChannelId = channelIdMatch[1]!;

  try {
    await api.channels.createMessage(targetChannelId, {
      embeds: [
        {
          title: "Support Tickets",
          description:
            "Need help from staff? Open a private ticket channel by typing:\n\n`+ticket <reason>`\n\nA private channel will be created only visible to you and staff.",
          color: 0x5865f2,
          footer: { text: "One ticket per user at a time." },
        },
      ],
    });

    await api.channels.createMessage(message.channel_id, {
      content: `Ticket panel sent to <#${targetChannelId}>.`,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to send ticket panel");
    await api.channels.createMessage(message.channel_id, {
      content: "Could not send the ticket panel. Make sure I can send messages in that channel.",
    });
  }
}
