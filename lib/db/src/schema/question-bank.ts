import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const questionBankTable = pgTable("question_bank", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // CSV id, e.g. "Q001"
  year: integer("year").notNull(),
  subject: text("subject").notNull(),
  type: text("type").notNull(), // "MCQ" | "CODING"
  question: text("question").notNull(),
  options: text("options").array().notNull().default([]), // MCQ only
  answerIndex: integer("answer_index"), // MCQ only, 0-based index into options
  sampleIo: text("sample_io"), // CODING only
  difficulty: text("difficulty").notNull(),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuestionBankSchema = createInsertSchema(questionBankTable).omit({
  id: true,
  createdAt: true,
});
export type InsertQuestionBank = z.infer<typeof insertQuestionBankSchema>;
export type QuestionBankRow = typeof questionBankTable.$inferSelect;
