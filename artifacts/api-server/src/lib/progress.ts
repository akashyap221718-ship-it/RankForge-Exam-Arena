import { db, practiceAttemptsTable, questionBankTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

export type SubjectProgress = { subject: string; total: number; attempted: number; solved: number };
export type Progress = { attempted: number; solved: number; subjects: SubjectProgress[] };

/**
 * Per-user progress, derived from practice_attempts (the source of truth).
 * - attempted = distinct MCQ questions the user has submitted at least once
 * - solved    = distinct MCQ questions the user has answered correctly at least once
 * Retrying the same question never inflates either number.
 */
export async function getProgress(userId: string): Promise<Progress> {
  const totals = await db
    .select({ subject: questionBankTable.subject, total: sql<number>`count(*)::int` })
    .from(questionBankTable)
    .where(eq(questionBankTable.type, "MCQ"))
    .groupBy(questionBankTable.subject);

  const perQuestion = await db
    .select({
      subject: questionBankTable.subject,
      questionId: practiceAttemptsTable.questionId,
      solved: sql<boolean>`bool_or(${practiceAttemptsTable.correct})`,
    })
    .from(practiceAttemptsTable)
    .innerJoin(questionBankTable, eq(practiceAttemptsTable.questionId, questionBankTable.id))
    .where(and(eq(practiceAttemptsTable.userId, userId), eq(questionBankTable.type, "MCQ")))
    .groupBy(questionBankTable.subject, practiceAttemptsTable.questionId);

  const bySubject = new Map<string, { attempted: number; solved: number }>();
  for (const row of perQuestion) {
    const entry = bySubject.get(row.subject) ?? { attempted: 0, solved: 0 };
    entry.attempted += 1;
    if (row.solved) entry.solved += 1;
    bySubject.set(row.subject, entry);
  }

  const subjects = totals.map((t) => ({
    subject: t.subject,
    total: t.total,
    attempted: bySubject.get(t.subject)?.attempted ?? 0,
    solved: bySubject.get(t.subject)?.solved ?? 0,
  }));

  return {
    attempted: subjects.reduce((n, s) => n + s.attempted, 0),
    solved: subjects.reduce((n, s) => n + s.solved, 0),
    subjects,
  };
}

/** True if this user has already answered this question correctly before. */
export async function hasSolvedBefore(
  tx: Pick<typeof db, "select">,
  userId: string,
  questionId: number,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: practiceAttemptsTable.id })
    .from(practiceAttemptsTable)
    .where(
      and(
        eq(practiceAttemptsTable.userId, userId),
        eq(practiceAttemptsTable.questionId, questionId),
        eq(practiceAttemptsTable.correct, true),
      ),
    )
    .limit(1);
  return Boolean(row);
}
