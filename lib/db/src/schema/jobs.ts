import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface AcceptedBid {
  id: number;
  price: number;
  deliveryTime: string;
  coverNote: string;
  builderEmail: string;
}

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  budget: integer("budget").notNull(),
  deadline: text("deadline").notNull(),
  category: text("category").notNull(),
  skills: text("skills").array().notNull().default([]),
  urgent: boolean("urgent").notNull().default(false),
  isNew: boolean("is_new").notNull().default(true),
  bids: integer("bids").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  status: text("status").notNull().default("open"),
  clientEmail: text("client_email").notNull().default(""),
  acceptedBid: jsonb("accepted_bid").$type<AcceptedBid | null>(),
  deliveryNote: text("delivery_note"),
  deliveryLink: text("delivery_link"),
  revisionNote: text("revision_note"),
  disputeReason: text("dispute_reason"),
  stripeSessionId: text("stripe_session_id"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  id: true,
  bids: true,
  createdAt: true,
  acceptedBid: true,
  deliveryNote: true,
  deliveryLink: true,
  revisionNote: true,
  disputeReason: true,
  stripeSessionId: true,
  cancelledAt: true,
});
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
