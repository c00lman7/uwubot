import type { Client } from "@discordjs/core";
import { GatewayDispatchEvents } from "@discordjs/core";
import { PREFIX, INVITE_PATTERNS, getEnv } from "../config.js";
import { isStaff, isAdmin } from "../permissions.js";
import { handleBl } from "../commands/bl.js";
import { handleUnbl } from "../commands/unbl.js";
import { handleKick } from "../commands/kick.js";
import { handleRank } from "../commands/rank.js";
import { handleTicket, handleClose } from "../commands/ticket.js";
import { handleHelp } from "../commands/help.js";
import { logger } from "../../lib/logger.js";

export function registerMessageCreateHandler(client: Client) {
  client.on(GatewayDispatchEvents.MessageCreate, async ({ api, data: message }) => {
    // Ignore bots
    if (message.author.bot) return;

    const content = message.content ?? "";
    const guildId = message.guild_id ?? getEnv("FLUXER_GUILD_ID");

    // ── Anti-invite-link detection ────────────────────────────────────────────
    const hasLink = INVITE_PATTERNS.some((re) => re.test(content));
    if (hasLink) {
      // Fetch member to check if they're admin
      let memberRoleNames: string[] = [];
      try {
        const member = await api.guilds.getMember(guildId, message.author.id);
        const roles = await api.guilds.getRoles(guildId);
        const roleMap = new Map(roles.map((r) => [r.id, r.name]));
        memberRoleNames = (member?.roles ?? []).map((id) => roleMap.get(id) ?? "");
      } catch (err) {
        logger.warn({ err }, "Could not fetch member for link check");
      }

      if (!isAdmin(memberRoleNames)) {
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

    // Help is public
    if (cmd === "help") {
      await handleHelp(message, {} as never, api as never);
      return;
    }

    // Ticket is public (anyone can open one)
    if (cmd === "ticket") {
      await handleTicket(message, args, api as never);
      return;
    }

    // All other commands require Recruiter+ rank
    let memberRoleNames: string[] = [];
    try {
      const member = await api.guilds.getMember(guildId, message.author.id);
      const roles = await api.guilds.getRoles(guildId);
      const roleMap = new Map(roles.map((r) => [r.id, r.name]));
      memberRoleNames = (member?.roles ?? []).map((id) => roleMap.get(id) ?? "");
    } catch (err) {
      logger.warn({ err }, "Could not fetch member for permission check");
    }

    const staffStatus = isStaff(memberRoleNames);

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
      default:
        await api.channels.createMessage(message.channel_id, {
          content: `❓ Unknown command \`${PREFIX}${cmd}\`. Use \`${PREFIX}help\` for a list of commands.`,
        });
    }
  });
}
