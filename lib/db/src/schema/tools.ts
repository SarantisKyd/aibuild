import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolsTable = pgTable("tools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(),
  rating: text("rating").notNull().default("5.0"),
  reviews: integer("reviews").notNull().default(0),
  bgColor: text("bg_color").notNull().default("#f3f4f6"),
  category: text("category").notNull().default("all"),
  priceAmount: integer("price_amount"),
  billingType: text("billing_type"),
  builderEmail: text("builder_email"),
  sales: integer("sales").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertToolSchema = createInsertSchema(toolsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof toolsTable.$inferSelect;
