import type { APIMessage } from "@discordjs/core";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";
import { db } from "@workspace/db";
import { tickets } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const CHANNEL_TEXT = 0;
const VIEW_CHANNEL = 1024n;
const SEND_MESSAGES = 2048n;
const READ_MESSAGE_HISTORY = 65536n;

type Api = {
  channels: {
    createMessage: (id: string, opts: { content: string }) => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;
  };
  guilds: {
    createChannel: (guildId: string, opts: object) => Promise<{ id: string }>;
    getMember: (guildId: string, userId: string) => Promise<{ roles: string[] } | null>;
  };
};

export async function handleTicket(message: APIMessage, args: string[], api: Api) {
  const guildId = getEnv("FLUXER_GUILD_ID");
  const categoryId = getEnv("TICKET_CATEGORY_ID");
  const userId = message.author.id;
  const username = message.author.username;
  const topic = args.join(" ") || "No topic provided";

  const existing = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.guildId, guildId), eq(tickets.userId, userId), eq(tickets.status, "open")))
    .limit(1);

  if (existing.length > 0) {
    await api.channels.createMessage(message.channel_id, {
      content: `You already have an open ticket: <#${existing[0]!.channelId}>`,
    });
    return;
  }

  try {
    const channelData: Record<string, unknown> = {
      name: `ticket-${username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      type: CHANNEL_TEXT,
      topic: `Ticket for ${username}: ${topic}`,
      permission_overwrites: [
        { id: guildId, type: 0, allow: "0", deny: String(VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY) },
        { id: userId, type: 1, allow: String(VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY), deny: "0" },
      ],
    };

    if (categoryId) channelData["parent_id"] = categoryId;

    const channel = await api.guilds.createChannel(guildId, channelData);

    await db.insert(tickets).values({ guildId, channelId: channel.id, userId, status: "open" });

    await api.channels.createMessage(channel.id, {
      content: `<@${userId}> your ticket has been created.\n**Topic:** ${topic}\n\nA staff member will assist you shortly. Use \`+close\` to close this ticket.`,
    });

    await api.channels.createMessage(message.channel_id, {
      content: `Ticket created: <#${channel.id}>`,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to create ticket channel");
    await api.channels.createMessage(message.channel_id, {
      content: "Could not create a ticket. Make sure I have the **Manage Channels** permission.",
    });
  }
}

export async function handleClose(message: APIMessage, args: string[], api: Api, isStaff: boolean) {
  const guildId = getEnv("FLUXER_GUILD_ID");
  const channelId = message.channel_id;
  const userId = message.author.id;
  const reason = args.join(" ") || "No reason provided";

  const ticket = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.channelId, channelId), eq(tickets.status, "open")))
    .limit(1);

  if (ticket.length === 0) {
    await api.channels.createMessage(channelId, { content: "This channel is not an open ticket." });
    return;
  }

  const isOwner = ticket[0]!.userId === userId;
  if (!isStaff && !isOwner) {
    await api.channels.createMessage(channelId, { content: "Only staff or the ticket owner can close this ticket." });
    return;
  }

  try {
    await db
      .update(tickets)
      .set({ status: "closed", closedAt: new Date(), closedBy: userId })
      .where(eq(tickets.id, ticket[0]!.id));

    await api.channels.createMessage(channelId, {
      content: `Ticket closed by <@${userId}>. Reason: ${reason}\nThis channel will be deleted in 5 seconds.`,
    });

    setTimeout(async () => {
      try {
        await api.channels.delete(channelId);
      } catch (err) {
        logger.warn({ err }, "Failed to delete ticket channel");
      }
    }, 5000);
  } catch (err) {
    logger.warn({ err }, "Failed to close ticket");
    await api.channels.createMessage(channelId, { content: "Failed to close ticket." });
  }
}
