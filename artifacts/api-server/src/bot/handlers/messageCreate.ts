import type { Client } from "@discordjs/core";
import { GatewayDispatchEvents } from "@discordjs/core";
import { PREFIX, INVITE_PATTERNS, getEnv } from "../config.js";
import { isStaff, isAdmin, type GuildRole } from "../permissions.js";
import { handleBl } from "../commands/bl.js";
import { handleUnbl } from "../commands/unbl.js";
import { handleKick } from "../commands/kick.js";
import { handleRank } from "../commands/rank.js";
import { handleUnrank } from "../commands/unrank.js";
import { handleTicket, handleClose } from "../commands/ticket.js";
import { handleTicketPanel } from "../commands/ticketPanel.js";
import { handleHelp } from "../commands/help.js";
import { logger } from "../../lib/logger.js";

export function registerMessageCreateHandler(client: Client) {
  client.on(GatewayDispatchEvents.MessageCreate, async ({ api, data: message }) => {
    if (message.author.bot) return;

    const content = message.content ?? "";
    const guildId = message.guild_id ?? getEnv("FLUXER_GUILD_ID");
    if (!guildId) return;

    // Fetch guild roles + member roles in parallel
    let allRoles: GuildRole[] = [];
    let memberRoleIds: string[] = [];
    try {
      const [roles, member] = await Promise.all([
        api.guilds.getRoles(guildId) as Promise<GuildRole[]>,
        api.guilds.getMember(guildId, message.author.id),
      ]);
      allRoles = roles;
      memberRoleIds = (member?.roles ?? []) as string[];
    } catch (err) {
      logger.warn({ err }, "Could not fetch guild roles or member");
    }

    // ── Anti-invite-link detection ────────────────────────────────────────────
    const hasLink = INVITE_PATTERNS.some((re) => {
      re.lastIndex = 0;
      return re.test(content);
    });

    if (hasLink) {
      if (!isAdmin(allRoles, memberRoleIds)) {
        try {
          await api.channels.deleteMessage(message.channel_id, message.id);
          await api.channels.createMessage(message.channel_id, {
            content: `🚫 No links, <@${message.author.id}>.`,
          });
        } catch (err) {
          logger.warn({ err }, "Failed to delete invite link message");
        }
        return;
      }
    }

    // ── Prefix command handling ───────────────────────────────────────────────
    if (!content.startsWith(PREFIX)) return;

    const [rawCmd, ...args] = content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = rawCmd?.toLowerCase();
    if (!cmd) return;

    if (cmd === "help") {
      await handleHelp(message, {} as never, api as never);
      return;
    }

    if (cmd === "ticket") {
      // +ticket channel #channel → send panel embed (staff only)
      if (args[0]?.toLowerCase() === "channel") {
        if (!isStaff(allRoles, memberRoleIds)) {
          await api.channels.createMessage(message.channel_id, {
            content: "❌ You need the **Recruiter** rank or higher to send a ticket panel.",
          });
          return;
        }
        await handleTicketPanel(message, args.slice(1), api as never);
      } else {
        // +ticket [topic] → open ticket directly (everyone)
        await handleTicket(message, args, api as never);
      }
      return;
    }

    const staffStatus = isStaff(allRoles, memberRoleIds);

    if (cmd === "close") {
      await handleClose(message, args, api as never, staffStatus);
      return;
    }

    if (!staffStatus) {
      await api.channels.createMessage(message.channel_id, {
        content: `❌ You need the **Recruiter** rank or higher to use \`${PREFIX}${cmd}\`.`,
      });
      return;
    }

    switch (cmd) {
      case "bl":
        await handleBl(message, args, api as never);
        break;
      case "unbl":
        await handleUnbl(message, args, api as never);
        break;
      case "kick":
        await handleKick(message, args, api as never);
        break;
      case "rank":
        await handleRank(message, args, api as never);
        break;
      case "unrank":
        await handleUnrank(message, args, api as never);
        break;
      default:
        await api.channels.createMessage(message.channel_id, {
          content: `❓ Unknown command \`${PREFIX}${cmd}\`. Use \`${PREFIX}help\` for a list of commands.`,
        });
    }
  });
}
