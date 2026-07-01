import { pgTable, text, serial, integer, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").notNull(),
  buyerEmail: text("buyer_email"),
  sessionId: text("session_id").notNull().unique(),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  disputeWindowEnds: bigint("dispute_window_ends", { mode: "number" }).notNull(),
  status: text("status").notNull().default("pending_payout"),
  payoutReleasedAt: timestamp("payout_released_at", { withTimezone: true }),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({
  id: true,
  purchasedAt: true,
});
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
