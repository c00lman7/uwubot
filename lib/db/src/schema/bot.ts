import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const inviteStats = pgTable("invite_stats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  guildId: text("guild_id").notNull(),
  inviterId: text("inviter_id").notNull(),
  inviteCode: text("invite_code").notNull(),
  totalInvited: integer("total_invited").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  closedBy: text("closed_by"),
});

export const blacklist = pgTable("blacklist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  reason: text("reason"),
  moderatorId: text("moderator_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
});

export const invitedBy = pgTable("invited_by", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  inviterId: text("inviter_id"),
  inviteCode: text("invite_code"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
