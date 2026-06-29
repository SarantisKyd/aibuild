import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const buildersTable = pgTable("builders", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuilderSchema = createInsertSchema(buildersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBuilder = z.infer<typeof insertBuilderSchema>;
export type Builder = typeof buildersTable.$inferSelect;
