import { createInsertSchema } from "drizzle-zod";
import { boolean, date, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const engineeringBranchesTable = pgTable("engineering_branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const engineeringSubjectsTable = pgTable("engineering_subjects", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => engineeringBranchesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studyMaterialsTable = pgTable("study_materials", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => engineeringSubjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  materialType: text("material_type").notNull().default("notes"),
  summary: text("summary").notNull(),
  content: text("content"),
  resourceUrl: text("resource_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const codingProblemsTable = pgTable("coding_problems", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  statement: text("statement").notNull(),
  difficulty: text("difficulty").notNull(),
  topic: text("topic").notNull(),
  supportedLanguages: text("supported_languages").array().notNull().default([]),
  examples: text("examples"),
  constraints: text("constraints"),
  expectedApproach: text("expected_approach"),
  // --- judge fields (stdin/stdout problems) ---
  questionCode: text("question_code"), // CSV id this problem came from, e.g. "Q091"
  inputFormat: text("input_format").notNull().default(""),
  outputFormat: text("output_format").notNull().default(""),
  starterCode: text("starter_code").notNull().default("{}"), // JSON: { language: code }
  timeLimitMs: integer("time_limit_ms").notNull().default(2000),
  kind: text("kind").notNull().default("program"), // "program" (stdin/stdout) or "sql" (result set)
  orderedResult: boolean("ordered_result").notNull().default(false), // sql only: row order must match
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const codingTestCasesTable = pgTable(
  "coding_test_cases",
  {
    id: serial("id").primaryKey(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => codingProblemsTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    input: text("input").notNull(),
    expectedOutput: text("expected_output").notNull(),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (table) => [index("coding_test_cases_problem_idx").on(table.problemId)],
);

export const codingSubmissionsTable = pgTable("coding_submissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  problemId: integer("problem_id").notNull(),
  language: text("language").notNull(),
  sourceCode: text("source_code").notNull(),
  status: text("status").notNull().default("Queued for secure evaluation"),
  verdict: text("verdict").notNull().default("Pending"),
  passedCount: integer("passed_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  runtimeMs: integer("runtime_ms").notNull().default(0),
  errorMessage: text("error_message").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interviewQuestionsTable = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  category: text("category").notNull(),
  prompt: text("prompt").notNull(),
  difficulty: text("difficulty").notNull().default("Medium"),
  answerGuide: text("answer_guide"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  workType: text("work_type").notNull(),
  experienceRequired: text("experience_required").notNull(),
  requiredSkills: text("required_skills").array().notNull().default([]),
  salary: text("salary"),
  description: text("description").notNull(),
  qualifications: text("qualifications").notNull(),
  applicationDeadline: date("application_deadline", { mode: "string" }),
  sourceUrl: text("source_url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  active: integer("active").notNull().default(1),
});

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  attachmentUrl: text("attachment_url"),
  status: text("status").notNull().default("New"),
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;