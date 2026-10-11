/**
 * Client for Judge0 (https://judge0.com), used for every language except JavaScript and SQL.
 *
 * Configuration (all optional, set them as Replit Secrets):
 *   JUDGE0_URL            base URL. Default: the public community instance https://ce.judge0.com
 *   JUDGE0_AUTH_TOKEN     sent as X-Auth-Token (self-hosted instances with auth enabled)
 *   JUDGE0_RAPIDAPI_KEY   sent as X-RapidAPI-Key (Judge0 on RapidAPI; set JUDGE0_URL to the RapidAPI URL)
 *
 * NOTE: the learner's source code is sent to whichever Judge0 server you configure.
 */

export class JudgeUnavailableError extends Error {}

export type Judge0Outcome = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  compileError: string;
  timeMs: number;
};

export type Judge0Language = "python" | "java" | "cpp" | "c" | "csharp" | "go" | "rust" | "kotlin" | "typescript" | "php" | "ruby";

/** name pattern used to find the language on the server, plus the id used if the lookup fails (Judge0 CE 1.13). */
const LANGUAGE_LOOKUP: Record<Judge0Language, { pattern: RegExp; fallbackId: number }> = {
  python: { pattern: /^Python \(3\./, fallbackId: 71 },
  java: { pattern: /^Java \(/, fallbackId: 62 },
  cpp: { pattern: /^C\+\+ \(GCC/, fallbackId: 54 },
  c: { pattern: /^C \(GCC/, fallbackId: 50 },
  csharp: { pattern: /^C# \(/, fallbackId: 51 },
  go: { pattern: /^Go \(/, fallbackId: 60 },
  rust: { pattern: /^Rust \(/, fallbackId: 73 },
  kotlin: { pattern: /^Kotlin \(/, fallbackId: 78 },
  typescript: { pattern: /^TypeScript \(/, fallbackId: 74 },
  php: { pattern: /^PHP \(/, fallbackId: 68 },
  ruby: { pattern: /^Ruby \(/, fallbackId: 72 },
};

/** Slower runtimes get a longer CPU limit than the problem's base time limit. */
const TIME_FACTOR: Record<Judge0Language, number> = {
  python: 3, java: 2, cpp: 1, c: 1, csharp: 2, go: 1, rust: 1, kotlin: 2, typescript: 2, php: 2, ruby: 3,
};

const BATCH_SIZE = 20;
const DEADLINE_MS = 40_000;
const REQUEST_TIMEOUT_MS = 15_000;

function baseUrl(): string {
  return (process.env.JUDGE0_URL ?? "https://ce.judge0.com").replace(/\/+$/, "");
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.JUDGE0_AUTH_TOKEN) h["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;
  if (process.env.JUDGE0_RAPIDAPI_KEY) {
    h["X-RapidAPI-Key"] = process.env.JUDGE0_RAPIDAPI_KEY;
    h["X-RapidAPI-Host"] = new URL(baseUrl()).host;
  }
  return h;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, { ...init, headers: headers(), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new JudgeUnavailableError("The code runner could not be reached. Try again in a moment, or use JavaScript.");
  }
  if (response.status === 429) throw new JudgeUnavailableError("The code runner is busy right now (rate limited). Wait a minute and try again.");
  if (response.status === 401 || response.status === 403) throw new JudgeUnavailableError("The code runner rejected our credentials. Ask the admin to check JUDGE0_AUTH_TOKEN / JUDGE0_RAPIDAPI_KEY.");
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new JudgeUnavailableError(`The code runner returned an error (${response.status}). ${detail}`.trim());
  }
  return (await response.json()) as T;
}

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const unb64 = (text: string | null | undefined) => (text ? Buffer.from(text, "base64").toString("utf8") : "");

/* ---------------- language ids ---------------- */

let languageCache: { at: number; ids: Map<Judge0Language, number> } | null = null;

async function languageId(language: Judge0Language): Promise<number> {
  const lookup = LANGUAGE_LOOKUP[language];
  if (!languageCache || Date.now() - languageCache.at > 60 * 60 * 1000) {
    const ids = new Map<Judge0Language, number>();
    try {
      const list = await call<{ id: number; name: string }[]>("/languages");
      for (const [key, value] of Object.entries(LANGUAGE_LOOKUP) as [Judge0Language, (typeof LANGUAGE_LOOKUP)[Judge0Language]][]) {
        // several versions can match (Python 3.8, 3.12...): take the newest, i.e. the highest id
        const found = list.filter((l) => value.pattern.test(l.name)).sort((a, b) => b.id - a.id)[0];
        if (found) ids.set(key, found.id);
      }
      languageCache = { at: Date.now(), ids };
    } catch (error) {
      if (error instanceof JudgeUnavailableError && /rate limited|credentials/.test(error.message)) throw error;
      // /languages is not essential: fall back to the well-known ids
      languageCache = { at: Date.now() - 55 * 60 * 1000, ids };
    }
  }
  return languageCache.ids.get(language) ?? lookup.fallbackId;
}

/* ---------------- running ---------------- */

type RawSubmission = {
  token: string;
  status?: { id: number; description?: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  exit_code?: number | null;
};

const FIELDS = "token,status,stdout,stderr,compile_output,message,time,exit_code";

function toOutcome(raw: RawSubmission): Judge0Outcome {
  const status = raw.status?.id ?? 13;
  const base = {
    stdout: unb64(raw.stdout),
    stderr: unb64(raw.stderr) || unb64(raw.message),
    timeMs: Math.round(Number(raw.time ?? 0) * 1000),
  };
  if (status === 13) throw new JudgeUnavailableError("The code runner had an internal error. Please try again.");
  if (status === 5) return { ...base, exitCode: null, timedOut: true, compileError: "" };
  if (status === 6) return { ...base, exitCode: 1, timedOut: false, compileError: unb64(raw.compile_output) || "Compilation failed." };
  if (status === 3 || status === 4) return { ...base, exitCode: 0, timedOut: false, compileError: "" };
  // 7-12 are runtime errors (signals, non-zero exit), 14 is exec format error
  const code = raw.exit_code && raw.exit_code !== 0 ? raw.exit_code : 1;
  return { ...base, exitCode: code, timedOut: false, compileError: "" };
}

/** Run the same program on several inputs. Results come back in the same order as `inputs`. */
export async function runBatch(language: Judge0Language, sourceCode: string, inputs: string[], timeLimitMs: number): Promise<Judge0Outcome[]> {
  const id = await languageId(language);
  const cpu = Math.min(10, Math.max(1, (timeLimitMs / 1000) * TIME_FACTOR[language]));
  const outcomes: Judge0Outcome[] = [];

  for (let start = 0; start < inputs.length; start += BATCH_SIZE) {
    const chunk = inputs.slice(start, start + BATCH_SIZE);
    const created = await call<{ token: string }[]>("/submissions/batch?base64_encoded=true", {
      method: "POST",
      body: JSON.stringify({
        submissions: chunk.map((stdin) => ({
          language_id: id,
          source_code: b64(sourceCode),
          stdin: b64(stdin),
          cpu_time_limit: cpu,
          wall_time_limit: Math.min(20, cpu * 3),
          memory_limit: 256000,
        })),
      }),
    });
    const tokens = created.map((c) => c.token);

    const deadline = Date.now() + DEADLINE_MS;
    let wait = 400;
    for (;;) {
      const result = await call<{ submissions: RawSubmission[] }>(`/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=${FIELDS}`);
      const byToken = new Map(result.submissions.map((s) => [s.token, s]));
      const rows = tokens.map((t) => byToken.get(t));
      if (rows.every((r) => r && (r.status?.id ?? 1) > 2)) {
        for (const r of rows) outcomes.push(toOutcome(r!));
        break;
      }
      if (Date.now() > deadline) throw new JudgeUnavailableError("The code runner took too long to respond. Please try again.");
      await new Promise((resolve) => setTimeout(resolve, wait));
      wait = Math.min(1500, Math.round(wait * 1.4));
    }
  }
  return outcomes;
}
