import { spawn } from "node:child_process";
import { formatSqlRows, validateUserSql } from "@workspace/db";
import { JudgeUnavailableError, runBatch, type Judge0Language } from "./judge0";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Judge engine. Runs a submitted JavaScript program in a separate, restricted Node process:
 *  - empty environment (no DATABASE_URL, no Clerk keys, nothing to steal)
 *  - Node permission model: no filesystem access except the one source file, no child processes,
 *    no worker threads, no native addons
 *  - hard wall-clock timeout, heap cap, output cap, and a limit on parallel runs
 *
 * IMPORTANT: this is a "seat belt", not a full sandbox. Node's permission model does not block
 * network access and is not designed to stop a determined attacker. It is fine for a college /
 * demo deployment where only signed-in learners can submit. For a public product, move execution
 * to an isolated runner (Judge0, Docker/gVisor, Firecracker) and keep this module's interface.
 */

export const JUDGE0_LANGUAGES = ["python", "java", "cpp", "c", "csharp", "go", "rust", "kotlin", "typescript", "php", "ruby"] as const;
export const SUPPORTED_LANGUAGES = ["javascript", ...JUDGE0_LANGUAGES, "sql"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export type Verdict =
  | "Accepted"
  | "Wrong Answer"
  | "Runtime Error"
  | "Time Limit Exceeded"
  | "Compilation Error";

export type TestCase = { input: string; expectedOutput: string; isSample: boolean };

export type CaseResult = {
  index: number;
  isSample: boolean;
  passed: boolean;
  verdict: Verdict;
  input: string; // empty for hidden cases
  expected: string; // empty for hidden cases
  output: string;
  error: string;
  runtimeMs: number;
};

export type JudgeResult = {
  verdict: Verdict;
  passed: number;
  total: number;
  runtimeMs: number;
  results: CaseResult[];
  errorMessage: string;
};

type RunOutcome = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputLimit: boolean;
  timeMs: number;
  compileError?: string;
};

const MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_PARALLEL_RUNS = 3;
const RATE_LIMIT_PER_MINUTE = 30;

/* ---------------- concurrency + rate limiting ---------------- */

let running = 0;
const waiting: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (running < MAX_PARALLEL_RUNS) {
    running += 1;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function releaseSlot(): void {
  const next = waiting.shift();
  if (next) next();
  else running -= 1;
}

const recentRuns = new Map<string, number[]>();

/** Returns false when the user has exceeded the per-minute run budget. */
export function allowRun(userId: string, now = Date.now()): boolean {
  const windowStart = now - 60_000;
  const stamps = (recentRuns.get(userId) ?? []).filter((t) => t > windowStart);
  if (stamps.length >= RATE_LIMIT_PER_MINUTE) {
    recentRuns.set(userId, stamps);
    return false;
  }
  stamps.push(now);
  recentRuns.set(userId, stamps);
  return true;
}

/* ---------------- running one program ---------------- */

function permissionFlag(): string {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  if (major < 20) throw new Error("The code judge needs Node.js 20 or newer.");
  const stable = major >= 24 || (major === 22 && minor >= 13) || (major === 23 && minor >= 5);
  return stable ? "--permission" : "--experimental-permission";
}

/** Runs a Node script in the restricted child process. Used for JavaScript submissions and for the SQL harness. */
async function runNodeScript(sourceCode: string, stdin: string, timeLimitMs: number): Promise<RunOutcome> {
  const dir = await mkdtemp(path.join(tmpdir(), "rf-judge-"));
  const file = path.join(dir, "solution.js");
  await acquireSlot();
  try {
    await writeFile(file, sourceCode, "utf8");
    return await new Promise<RunOutcome>((resolve) => {
      const started = Date.now();
      const child = spawn(
        process.execPath,
        [permissionFlag(), `--allow-fs-read=${file}`, "--max-old-space-size=128", file],
        { cwd: dir, env: {}, stdio: ["pipe", "pipe", "pipe"] },
      );

      let stdout = "";
      let stderr = "";
      let bytes = 0;
      let timedOut = false;
      let outputLimit = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeLimitMs);

      const collect = (which: "out" | "err") => (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > MAX_OUTPUT_BYTES) {
          outputLimit = true;
          child.kill("SIGKILL");
          return;
        }
        if (which === "out") stdout += chunk.toString("utf8");
        else stderr += chunk.toString("utf8");
      };
      child.stdout.on("data", collect("out"));
      child.stderr.on("data", collect("err"));

      child.stdin.on("error", () => undefined); // program exited before reading all input
      child.stdin.end(stdin);

      child.on("error", (error) => {
        clearTimeout(timer);
        resolve({ stdout, stderr: String(error), exitCode: null, timedOut, outputLimit, timeMs: Date.now() - started });
      });
      child.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode, timedOut, outputLimit, timeMs: Date.now() - started });
      });
    });
  } finally {
    releaseSlot();
    await rm(dir, { recursive: true, force: true });
  }
}

/* ---------------- judging ---------------- */

/** Ignore trailing spaces on each line and trailing blank lines. */
export function normalizeOutput(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((line) => line.replace(/\s+$/, ""));
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

function cleanError(stderr: string): string {
  return stderr
    .replace(/\/[^\s:()]*solution\.js/g, "solution.js")
    .split("\n")
    .filter((line) => !/^\s+at .*node:internal/.test(line))
    .join("\n")
    .trim()
    .slice(0, 1200);
}

function cap(text: string, max = 2000): string {
  return text.length > max ? `${text.slice(0, max)}\n... (output truncated)` : text;
}

function classify(outcome: RunOutcome, expected: string | null, ordered = true): { verdict: Verdict; passed: boolean; error: string } {
  if (outcome.timedOut) return { verdict: "Time Limit Exceeded", passed: false, error: "Your program took too long." };
  if (outcome.outputLimit) return { verdict: "Runtime Error", passed: false, error: "Your program printed too much output." };
  if (outcome.compileError) return { verdict: "Compilation Error", passed: false, error: cap(outcome.compileError, 1200) };
  if (outcome.exitCode !== 0) {
    const error = cleanError(outcome.stderr) || `Program exited with code ${outcome.exitCode}.`;
    const isSyntax = /SyntaxError/.test(outcome.stderr);
    return { verdict: isSyntax ? "Compilation Error" : "Runtime Error", passed: false, error };
  }
  if (expected === null) return { verdict: "Accepted", passed: true, error: "" };
  return sameOutput(outcome.stdout, expected, ordered)
    ? { verdict: "Accepted", passed: true, error: "" }
    : { verdict: "Wrong Answer", passed: false, error: "" };
}

function sameOutput(actual: string, expected: string, ordered: boolean): boolean {
  const a = normalizeOutput(actual);
  const e = normalizeOutput(expected);
  if (ordered) return a === e;
  return a.split("\n").sort().join("\n") === e.split("\n").sort().join("\n");
}

export function isSupportedLanguage(language: string): language is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(language);
}

/* ---------------- SQL (runs in-process SQLite inside the restricted child) ---------------- */

const SQL_HARNESS = `
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { setup, query } = JSON.parse(fs.readFileSync(0, 'utf8'));
try {
  const db = new DatabaseSync(':memory:');
  db.exec(setup);
  const stmt = db.prepare(query);
  let rows;
  if (typeof stmt.setReturnArrays === 'function') { stmt.setReturnArrays(true); rows = stmt.all(); }
  else rows = stmt.all().map((r) => Object.values(r));
  process.stdout.write(JSON.stringify({ rows }));
} catch (e) {
  process.stdout.write(JSON.stringify({ error: String((e && e.message) || e) }));
}
`;

/** Runs one learner query against one dataset. Returns the result rows as text (see formatSqlRows) or an error. */
async function runSqlOnce(setup: string, query: string, timeLimitMs: number): Promise<RunOutcome> {
  const outcome = await runNodeScript(SQL_HARNESS, JSON.stringify({ setup, query }), timeLimitMs);
  if (outcome.timedOut || outcome.outputLimit || outcome.exitCode !== 0) return outcome;
  try {
    const parsed = JSON.parse(outcome.stdout) as { rows?: unknown[][]; error?: string };
    if (parsed.error !== undefined) {
      const syntax = /syntax error|incomplete input|unrecognized token/i.test(parsed.error);
      return syntax
        ? { ...outcome, exitCode: 1, stdout: "", compileError: parsed.error }
        : { ...outcome, exitCode: 1, stdout: "", stderr: parsed.error };
    }
    return { ...outcome, stdout: formatSqlRows(parsed.rows ?? []) };
  } catch {
    return { ...outcome, exitCode: 1, stderr: "The query result could not be read." };
  }
}

/* ---------------- judging ---------------- */

export type JudgeOptions = { stopOnFail: boolean; sqlOrdered?: boolean };

function toCaseResult(index: number, test: TestCase, outcome: RunOutcome, ordered: boolean): CaseResult {
  const { verdict, passed, error } = classify(outcome, test.expectedOutput, ordered);
  return {
    index,
    isSample: test.isSample,
    passed,
    verdict,
    input: test.isSample ? test.input : "",
    expected: test.isSample ? test.expectedOutput : "",
    output: cap(outcome.stdout),
    error,
    runtimeMs: outcome.timeMs,
  };
}

async function outcomesFor(language: Language, sourceCode: string, tests: TestCase[], timeLimitMs: number): Promise<RunOutcome[]> {
  if (language === "javascript") {
    const outcomes: RunOutcome[] = [];
    for (const test of tests) outcomes.push(await runNodeScript(sourceCode, test.input, timeLimitMs));
    return outcomes;
  }
  if (language === "sql") {
    const outcomes: RunOutcome[] = [];
    for (const test of tests) outcomes.push(await runSqlOnce(test.input, sourceCode, timeLimitMs));
    return outcomes;
  }
  const remote = await runBatch(language as Judge0Language, sourceCode, tests.map((t) => t.input), timeLimitMs);
  return remote.map((r) => ({ ...r, outputLimit: false }));
}

/**
 * Run a submission against test cases, in order.
 * stopOnFail=true (submissions) stops at the first failing case, like LeetCode.
 * Hidden cases never leak their input or expected output in the result.
 */
export async function judge(language: Language, sourceCode: string, tests: TestCase[], timeLimitMs: number, { stopOnFail, sqlOrdered = false }: JudgeOptions): Promise<JudgeResult> {
  const ordered = language === "sql" ? sqlOrdered : true;

  if (language === "sql") {
    const problem = validateUserSql(sourceCode);
    if (problem) {
      const first = tests[0];
      return {
        verdict: "Compilation Error",
        passed: 0,
        total: tests.length,
        runtimeMs: 0,
        errorMessage: problem,
        results: [{ index: 1, isSample: first?.isSample ?? false, passed: false, verdict: "Compilation Error", input: first?.isSample ? first.input : "", expected: first?.isSample ? first.expectedOutput : "", output: "", error: problem, runtimeMs: 0 }],
      };
    }
  }

  const outcomes = await outcomesFor(language, sourceCode, tests, timeLimitMs);
  const results: CaseResult[] = [];
  let maxTime = 0;
  for (const [i, test] of tests.entries()) {
    const outcome = outcomes[i]!;
    maxTime = Math.max(maxTime, outcome.timeMs);
    const result = toCaseResult(i + 1, test, outcome, ordered);
    results.push(result);
    if (!result.passed && stopOnFail) break;
  }
  const failed = results.find((r) => !r.passed);
  return {
    verdict: failed ? failed.verdict : "Accepted",
    passed: results.filter((r) => r.passed).length,
    total: tests.length,
    runtimeMs: maxTime,
    results,
    errorMessage: failed?.error ?? "",
  };
}

/** Run a program once on arbitrary input (the "custom input" box). No expected output. */
export async function runOnce(language: Language, sourceCode: string, input: string, timeLimitMs: number): Promise<CaseResult> {
  if (language === "sql") throw new JudgeUnavailableError("Custom input is not available for SQL problems.");
  const [outcome] = await outcomesFor(language, sourceCode, [{ input, expectedOutput: "", isSample: false }], timeLimitMs);
  const { verdict, passed, error } = classify(outcome!, null);
  return { index: 1, isSample: false, passed, verdict, input, expected: "", output: cap(outcome!.stdout), error, runtimeMs: outcome!.timeMs };
}

export { JudgeUnavailableError };
