import type { Client } from "@discordjs/core";
import {
  GatewayDispatchEvents,
  InteractionType,
  ComponentType,
  TextInputStyle,
  ChannelType,
} from "@discordjs/core";
import type { RESTPostAPIGuildChannelJSONBody } from "@discordjs/core";
import { getEnv } from "../config.js";
import { logger } from "../../lib/logger.js";
import { db } from "@workspace/db";
import { tickets } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const TICKET_BUTTON_ID = "fluxer_open_ticket";
const TICKET_MODAL_ID = "fluxer_ticket_modal";
const TICKET_INPUT_ID = "ticket_reason";

export function registerInteractionCreateHandler(client: Client) {
  client.on(GatewayDispatchEvents.InteractionCreate, async ({ api, data: interaction }) => {
    const customId = (interaction.data as { custom_id?: string } | undefined)?.custom_id;

    // ── Button click → show modal ─────────────────────────────────────────────
    if (interaction.type === InteractionType.MessageComponent && customId === TICKET_BUTTON_ID) {
      try {
        await api.interactions.createModal(interaction.id, interaction.token, {
          custom_id: TICKET_MODAL_ID,
          title: "Open a Ticket",
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.TextInput,
                  custom_id: TICKET_INPUT_ID,
                  label: "What is your ticket about?",
                  style: TextInputStyle.Paragraph,
                  placeholder: "Describe your reason, question, or issue...",
                  required: true,
                  min_length: 5,
                  max_length: 500,
                },
              ],
            },
          ],
        });
      } catch (err) {
        logger.warn({ err }, "Failed to show ticket modal");
      }
      return;
    }

    // ── Modal submit → create ticket ──────────────────────────────────────────
    if (interaction.type === InteractionType.ModalSubmit && customId === TICKET_MODAL_ID) {
      const userId = interaction.member?.user?.id ?? (interaction as { user?: { id: string } }).user?.id;
      const username =
        interaction.member?.user?.username ??
        (interaction as { user?: { username: string } }).user?.username ??
        "user";
      const guildId = interaction.guild_id ?? getEnv("FLUXER_GUILD_ID");
      const applicationId = interaction.application_id;

      const modalComponents = (
        interaction.data as {
          components?: Array<{ components: Array<{ custom_id: string; value: string }> }>;
        }
      )?.components ?? [];
      const reason =
        modalComponents[0]?.components.find((c) => c.custom_id === TICKET_INPUT_ID)?.value ??
        "No reason provided";

      if (!userId || !guildId) {
        await api.interactions.reply(interaction.id, interaction.token, {
          content: "❌ Could not identify your account. Please try again.",
          flags: 64,
        });
        return;
      }

      // Check existing open ticket
      const existing = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.guildId, guildId), eq(tickets.userId, userId), eq(tickets.status, "open")))
        .limit(1);

      if (existing.length > 0) {
        await api.interactions.reply(interaction.id, interaction.token, {
          content: `❌ You already have an open ticket: <#${existing[0]!.channelId}>`,
          flags: 64,
        });
        return;
      }

      // Acknowledge immediately so the modal closes
      await api.interactions.reply(interaction.id, interaction.token, {
        content: "⏳ Creating your ticket...",
        flags: 64,
      });

      try {
        const categoryId = getEnv("TICKET_CATEGORY_ID");
        const VIEW_CHANNEL = 1024n;
        const SEND_MESSAGES = 2048n;
        const READ_MESSAGE_HISTORY = 65536n;

        const channelBody: RESTPostAPIGuildChannelJSONBody = {
          name: `ticket-${username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          type: ChannelType.GuildText,
          topic: `Ticket for ${username}: ${reason}`,
          parent_id: categoryId || undefined,
          permission_overwrites: [
            { id: guildId, type: 0, allow: "0", deny: String(VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY) },
            { id: userId, type: 1, allow: String(VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY), deny: "0" },
          ],
        };

        const channel = (await api.guilds.createChannel(guildId, channelBody)) as { id: string };

        await db.insert(tickets).values({ guildId, channelId: channel.id, userId, status: "open" });

        await api.channels.createMessage(channel.id, {
          content: [
            `🎫 <@${userId}> — your ticket has been created!`,
            `**Reason:** ${reason}`,
            "",
            "A staff member will assist you shortly. Use `+close` to close this ticket when resolved.",
          ].join("\n"),
        });

        await api.interactions.editReply(applicationId, interaction.token, {
          content: `✅ Ticket created: <#${channel.id}>`,
        });
      } catch (err) {
        logger.warn({ err }, "Failed to create ticket from modal");
        await api.interactions.editReply(applicationId, interaction.token, {
          content: "❌ Could not create ticket. Please contact a staff member directly.",
        });
      }
    }
  });
}
