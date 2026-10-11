import { codingProblemsTable, codingSubmissionsTable, codingTestCasesTable, db } from "@workspace/db";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { isSupportedLanguage, judge, JudgeUnavailableError, runOnce, type CaseResult, type Language, type TestCase } from "./judge";

export type ProblemStatus = "solved" | "attempted" | "todo";

export class CodingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function statusByProblem(userId: string): Promise<Map<number, ProblemStatus>> {
  const rows = await db
    .select({
      problemId: codingSubmissionsTable.problemId,
      solved: sql<boolean>`bool_or(${codingSubmissionsTable.verdict} = 'Accepted')`,
    })
    .from(codingSubmissionsTable)
    .where(eq(codingSubmissionsTable.userId, userId))
    .groupBy(codingSubmissionsTable.problemId);
  return new Map(rows.map((r) => [r.problemId, r.solved ? "solved" : "attempted"]));
}

export async function listProblems(userId: string, filters: { difficulty?: string; topic?: string }) {
  const where = [];
  if (filters.difficulty) where.push(ilike(codingProblemsTable.difficulty, filters.difficulty));
  if (filters.topic) where.push(ilike(codingProblemsTable.topic, `%${filters.topic}%`));

  const problems = await db
    .select({
      id: codingProblemsTable.id,
      slug: codingProblemsTable.slug,
      title: codingProblemsTable.title,
      difficulty: codingProblemsTable.difficulty,
      topic: codingProblemsTable.topic,
    })
    .from(codingProblemsTable)
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(codingProblemsTable.id));

  const totals = await db
    .select({
      problemId: codingSubmissionsTable.problemId,
      total: sql<number>`count(*)::int`,
      accepted: sql<number>`(count(*) filter (where ${codingSubmissionsTable.verdict} = 'Accepted'))::int`,
    })
    .from(codingSubmissionsTable)
    .groupBy(codingSubmissionsTable.problemId);
  const totalsById = new Map(totals.map((t) => [t.problemId, t]));
  const mine = await statusByProblem(userId);

  return problems.map((p) => {
    const t = totalsById.get(p.id);
    return {
      ...p,
      acceptance: t && t.total > 0 ? Math.round((t.accepted / t.total) * 100) : -1,
      status: mine.get(p.id) ?? ("todo" as ProblemStatus),
    };
  });
}

export async function getProblem(userId: string, slug: string) {
  const [problem] = await db.select().from(codingProblemsTable).where(eq(codingProblemsTable.slug, slug)).limit(1);
  if (!problem) return null;
  const samples = await db
    .select({ input: codingTestCasesTable.input, output: codingTestCasesTable.expectedOutput })
    .from(codingTestCasesTable)
    .where(and(eq(codingTestCasesTable.problemId, problem.id), eq(codingTestCasesTable.isSample, true)))
    .orderBy(asc(codingTestCasesTable.position));
  const mine = await statusByProblem(userId);

  let starterCode: Record<string, string> = {};
  try {
    starterCode = JSON.parse(problem.starterCode) as Record<string, string>;
  } catch {
    starterCode = {};
  }

  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    topic: problem.topic,
    statement: problem.statement,
    inputFormat: problem.inputFormat,
    outputFormat: problem.outputFormat,
    constraints: problem.constraints,
    timeLimitMs: problem.timeLimitMs,
    kind: problem.kind,
    languages: problem.supportedLanguages,
    starterCode,
    samples,
    status: mine.get(problem.id) ?? "todo",
  };
}

async function loadProblemAndTests(problemId: number, language: string) {
  if (!isSupportedLanguage(language)) throw new CodingError(400, `Language "${language}" is not supported.`);
  const [problem] = await db.select().from(codingProblemsTable).where(eq(codingProblemsTable.id, problemId)).limit(1);
  if (!problem) throw new CodingError(404, "Problem not found");
  if (!problem.supportedLanguages.includes(language)) {
    throw new CodingError(400, `This problem cannot be solved in "${language}". Available: ${problem.supportedLanguages.join(", ")}.`);
  }
  const tests = await db
    .select()
    .from(codingTestCasesTable)
    .where(eq(codingTestCasesTable.problemId, problemId))
    .orderBy(asc(codingTestCasesTable.position));
  if (tests.length === 0) throw new CodingError(409, "This problem has no test cases yet");
  const cases: TestCase[] = tests.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: t.isSample }));
  return { problem, cases, language: language as Language };
}

/** Turns "runner is down / rate limited" into a clean 503 for the API. */
async function guardRunner<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof JudgeUnavailableError) throw new CodingError(503, error.message);
    throw error;
  }
}

/** "Run": sample tests only (or one custom input). Nothing is saved. */
export async function runCode(input: { problemId: number; language: string; sourceCode: string; customInput?: string }) {
  const { problem, cases, language } = await loadProblemAndTests(input.problemId, input.language);

  if (input.customInput !== undefined && input.customInput.trim() !== "") {
    if (problem.kind === "sql") throw new CodingError(400, "Custom input is not available for SQL problems.");
    const one: CaseResult = await guardRunner(() => runOnce(language, input.sourceCode, input.customInput!, problem.timeLimitMs));
    return {
      verdict: one.passed ? "Finished" : one.verdict,
      passed: one.passed ? 1 : 0,
      total: 1,
      runtimeMs: one.runtimeMs,
      custom: true,
      results: [one],
    };
  }

  const samples = cases.filter((c) => c.isSample);
  const result = await guardRunner(() => judge(language, input.sourceCode, samples, problem.timeLimitMs, { stopOnFail: false, sqlOrdered: problem.orderedResult }));
  return { verdict: result.verdict, passed: result.passed, total: result.total, runtimeMs: result.runtimeMs, custom: false, results: result.results };
}

/** "Submit": every test (samples first, then hidden). Stops at the first failure and is saved. */
export async function submitCode(userId: string, input: { problemId: number; language: string; sourceCode: string }) {
  const { problem, cases, language } = await loadProblemAndTests(input.problemId, input.language);
  const result = await guardRunner(() => judge(language, input.sourceCode, cases, problem.timeLimitMs, { stopOnFail: true, sqlOrdered: problem.orderedResult }));

  const [row] = await db
    .insert(codingSubmissionsTable)
    .values({
      userId,
      problemId: problem.id,
      language: input.language,
      sourceCode: input.sourceCode,
      status: result.verdict,
      verdict: result.verdict,
      passedCount: result.passed,
      totalCount: result.total,
      runtimeMs: result.runtimeMs,
      errorMessage: result.errorMessage,
    })
    .returning({ id: codingSubmissionsTable.id });

  const failedCase = result.results.find((r) => !r.passed);
  return {
    id: row!.id,
    verdict: result.verdict,
    passed: result.passed,
    total: result.total,
    runtimeMs: result.runtimeMs,
    errorMessage: result.errorMessage,
    ...(failedCase ? { failedCase } : {}),
  };
}

export async function listSubmissions(userId: string, problemId?: number) {
  const rows = await db
    .select({
      id: codingSubmissionsTable.id,
      problemId: codingSubmissionsTable.problemId,
      problemTitle: codingProblemsTable.title,
      problemSlug: codingProblemsTable.slug,
      language: codingSubmissionsTable.language,
      verdict: codingSubmissionsTable.verdict,
      passed: codingSubmissionsTable.passedCount,
      total: codingSubmissionsTable.totalCount,
      runtimeMs: codingSubmissionsTable.runtimeMs,
      errorMessage: codingSubmissionsTable.errorMessage,
      sourceCode: codingSubmissionsTable.sourceCode,
      createdAt: codingSubmissionsTable.createdAt,
    })
    .from(codingSubmissionsTable)
    .innerJoin(codingProblemsTable, eq(codingSubmissionsTable.problemId, codingProblemsTable.id))
    .where(
      problemId === undefined
        ? eq(codingSubmissionsTable.userId, userId)
        : and(eq(codingSubmissionsTable.userId, userId), eq(codingSubmissionsTable.problemId, problemId)),
    )
    .orderBy(desc(codingSubmissionsTable.createdAt))
    .limit(50);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
