import { createInsertSchema } from "drizzle-zod";
import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const learnerProfilesTable = pgTable(
  "learner_profiles",
  {
    userId: text("user_id").primaryKey(),
    fullName: text("full_name").notNull().default(""),
    username: text("username").notNull().default(""),
    phoneNumber: text("phone_number"),
    college: text("college"),
    course: text("course"),
    branch: text("branch"),
    year: text("year"),
    graduationYear: integer("graduation_year"),
    skills: text("skills").array().notNull().default([]),
    programmingLanguages: text("programming_languages").array().notNull().default([]),
    interests: text("interests").array().notNull().default([]),
    careerGoal: text("career_goal"),
    preferredJobRole: text("preferred_job_role"),
    learningGoals: text("learning_goals"),
    skillLevel: text("skill_level"),
    targetCompanies: text("target_companies").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("learner_profiles_branch_idx").on(table.branch),
    index("learner_profiles_college_idx").on(table.college),
  ],
);

export const learnerStatsTable = pgTable("learner_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => learnerProfilesTable.userId, { onDelete: "cascade" }),
  rating: integer("rating").notNull().default(1200),
  points: integer("points").notNull().default(0),
  solved: integer("solved").notNull().default(0),
  correctAttempts: integer("correct_attempts").notNull().default(0),
  totalAttempts: integer("total_attempts").notNull().default(0),
  focusMinutes: integer("focus_minutes").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastPracticeAt: timestamp("last_practice_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const practiceAttemptsTable = pgTable(
  "practice_attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => learnerProfilesTable.userId, { onDelete: "cascade" }),
    questionId: integer("question_id").notNull(),
    selectedOption: integer("selected_option").notNull(),
    secondsSpent: integer("seconds_spent").notNull(),
    correct: boolean("correct").notNull(),
    points: integer("points").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("practice_attempts_user_id_idx").on(table.userId)],
);

export const insertLearnerProfileSchema = createInsertSchema(learnerProfilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertLearnerProfile = z.infer<typeof insertLearnerProfileSchema>;
export type LearnerProfile = typeof learnerProfilesTable.$inferSelect;
export type LearnerStats = typeof learnerStatsTable.$inferSelect;
export type PracticeAttempt = typeof practiceAttemptsTable.$inferSelect;