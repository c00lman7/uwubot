import type { APIMessage } from "@discordjs/core";
import { ComponentType, ButtonStyle } from "@discordjs/core";
import { logger } from "../../lib/logger.js";

const TICKET_BUTTON_ID = "fluxer_open_ticket";

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
    const sent = await api.channels.createMessage(targetChannelId, {
      embeds: [
        {
          title: "Support Tickets",
          description: "Click the button below to open a ticket. A popup will ask for your reason and a private channel will be created for you.",
          color: 0x5865f2,
          footer: { text: "One ticket per user at a time." },
        },
      ],
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              custom_id: TICKET_BUTTON_ID,
              label: "Open a Ticket",
              style: ButtonStyle.Primary,
            },
          ],
        },
      ],
    }) as { id: string; components?: unknown[] };

    logger.info({ messageId: sent.id, componentsBack: sent.components }, "Ticket panel sent");

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
