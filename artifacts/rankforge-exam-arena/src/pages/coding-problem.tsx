import { useState, type KeyboardEvent } from 'react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock3, Loader2, Play, RotateCcw, Send } from 'lucide-react';
import {
  getGetCodingProblemQueryKey,
  getListCodingProblemsQueryKey,
  useGetCodingProblem,
  useRunCodingSolution,
  useSubmitCodingSolution,
  type CodingCaseResult,
  type CodingProblemDetail,
  type CodingRunResult,
  type CodingSubmissionResult,
} from '@workspace/api-client-react';
import { AppShell, LoadingBlocks, QueryState } from '@/components/AppShell';
import { CodingSubmissions } from '@/components/CodingSubmissions';
import { DifficultyBadge, VerdictBadge, errorText } from '@/components/CodingBadges';

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript', python: 'Python 3', java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#', go: 'Go',
  rust: 'Rust', kotlin: 'Kotlin', typescript: 'TypeScript', php: 'PHP', ruby: 'Ruby', sql: 'SQL (SQLite)',
};
/** JavaScript and SQL run on our own server; every other language runs on the Judge0 code runner. */
const isRemoteLanguage = (language: string) => language !== 'javascript' && language !== 'sql';

function loadDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function saveDraft(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage can be unavailable (private mode); the editor still works */
  }
}

function Block({ label, text, tone = 'default' }: { label: string; text: string; tone?: 'default' | 'error' }) {
  return (
    <div>
      <p className="mb-1 font-mono-ui text-[10px] uppercase tracking-[.14em] text-muted-foreground">{label}</p>
      <pre className={`max-h-48 overflow-auto whitespace-pre-wrap rounded-lg p-3 font-mono-ui text-xs leading-relaxed ${tone === 'error' ? 'bg-red-500/8 text-red-700 dark:text-red-400' : 'bg-muted'}`}>{text === '' ? ' ' : text}</pre>
    </div>
  );
}

function CaseView({ c, showExpected, sql = false }: { c: CodingCaseResult; showExpected: boolean; sql?: boolean }) {
  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-background p-3.5" data-testid={`case-result-${c.index}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-bold">{c.isSample || showExpected ? `Case ${c.index}` : `Test ${c.index}`}</span>
        <VerdictBadge verdict={c.passed ? 'Accepted' : c.verdict} />
        <span className="ml-auto font-mono-ui text-[10px] text-muted-foreground">{c.runtimeMs} ms</span>
      </div>
      {c.input !== '' ? <Block label={sql ? 'Tables' : 'Input'} text={c.input.trimEnd()} /> : null}
      {showExpected && c.expected !== '' ? <Block label={sql ? 'Expected result' : 'Expected output'} text={c.expected.trimEnd()} /> : null}
      {c.output !== '' || !c.error ? <Block label={sql ? 'Your result' : 'Your output'} text={c.output.trimEnd()} /> : null}
      {c.error ? <Block label="Error" text={c.error} tone="error" /> : null}
    </div>
  );
}

export function RunPanel({ result, sql = false }: { result: CodingRunResult; sql?: boolean }) {
  return (
    <div className="space-y-3" data-testid="panel-run-result">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={result.verdict} />
        <span className="text-sm font-semibold">{result.custom ? 'Custom input' : `${result.passed} / ${result.total} sample tests passed`}</span>
        <span className="flex items-center gap-1 font-mono-ui text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" />{result.runtimeMs} ms</span>
      </div>
      {result.results.map((c) => <CaseView key={c.index} c={c} showExpected={!result.custom} sql={sql} />)}
    </div>
  );
}

export function SubmitPanel({ result, sql = false }: { result: CodingSubmissionResult; sql?: boolean }) {
  const accepted = result.verdict === 'Accepted';
  const failed = result.failedCase;
  return (
    <div className="space-y-3" data-testid="panel-submit-result">
      <div className={`rounded-xl p-4 ${accepted ? 'bg-emerald-500/10' : 'bg-red-500/8'}`}>
        <p className={`text-lg font-extrabold ${accepted ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`} data-testid="text-submit-verdict">{result.verdict}</p>
        <p className="mt-1 font-mono-ui text-xs text-muted-foreground">
          {result.passed} / {result.total} {sql ? 'datasets' : 'test cases'} passed · {result.runtimeMs} ms
        </p>
        {accepted ? <p className="mt-2 text-sm">Nice work. Every sample and hidden test passed.</p> : null}
      </div>
      {failed ? (
        failed.isSample ? (
          <CaseView c={failed} showExpected sql={sql} />
        ) : (
          <div className="space-y-2.5 rounded-xl border border-border bg-background p-3.5">
            <p className="text-sm font-semibold">Failed on hidden test #{failed.index}</p>
            <p className="text-xs text-muted-foreground">{sql ? 'Hidden datasets are not shown. Think about NULLs, ties, duplicates and empty results.' : 'Hidden test inputs are not shown. Try edge cases: the smallest and largest inputs, repeated values, negative numbers.'}</p>
            {failed.output !== '' ? <Block label={sql ? 'Your result' : 'Your output'} text={failed.output.trimEnd()} /> : null}
            {failed.error ? <Block label="Error" text={failed.error} tone="error" /> : null}
          </div>
        )
      ) : null}
    </div>
  );
}

export function Workspace({ problem }: { problem: CodingProblemDetail }) {
  const queryClient = useQueryClient();
  const isSql = problem.kind === 'sql';
  const [language, setLanguage] = useState(problem.languages[0] ?? 'javascript');
  const draftKey = (lang: string) => `rankforge-code:${problem.slug}:${lang}`;
  const [code, setCode] = useState(() => loadDraft(draftKey(problem.languages[0] ?? 'javascript')) ?? problem.starterCode[problem.languages[0] ?? 'javascript'] ?? '');
  const [tab, setTab] = useState<'description' | 'submissions'>('description');
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState(problem.samples[0]?.input ?? '');
  const [panel, setPanel] = useState<'run' | 'submit' | null>(null);
  const [runResult, setRunResult] = useState<CodingRunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<CodingSubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMutation = useRunCodingSolution();
  const submitMutation = useSubmitCodingSolution();
  const busy = runMutation.isPending || submitMutation.isPending;

  const changeCode = (value: string) => {
    setCode(value);
    saveDraft(draftKey(language), value);
  };
  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    setCode(loadDraft(draftKey(lang)) ?? problem.starterCode[lang] ?? '');
  };
  const resetCode = () => {
    saveDraft(draftKey(language), null);
    setCode(problem.starterCode[language] ?? '');
  };

  const run = () => {
    if (busy) return;
    setError(null);
    setPanel('run');
    runMutation.mutate(
      { data: { problemId: problem.id, language, sourceCode: code, ...(useCustom && !isSql ? { customInput } : {}) } },
      { onSuccess: (data) => setRunResult(data), onError: (e) => setError(errorText(e)) },
    );
  };

  const submit = () => {
    if (busy) return;
    setError(null);
    setPanel('submit');
    submitMutation.mutate(
      { data: { problemId: problem.id, language, sourceCode: code } },
      {
        onSuccess: (data) => {
          setSubmitResult(data);
          void queryClient.invalidateQueries({ queryKey: getGetCodingProblemQueryKey(problem.slug) });
          void queryClient.invalidateQueries({ queryKey: getListCodingProblemsQueryKey() });
          void queryClient.invalidateQueries({ queryKey: ['/api/coding/submissions'] });
        },
        onError: (e) => setError(errorText(e)),
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const el = event.currentTarget;
      const { selectionStart: start, selectionEnd: end } = el;
      const next = `${code.slice(0, start)}  ${code.slice(end)}`;
      changeCode(next);
      requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      run();
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ---------- left: statement / submissions ---------- */}
      <section className="min-w-0 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex gap-1 border-b border-border p-2">
          {(['description', 'submissions'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} data-testid={`tab-${t}`} className={`rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors ${tab === t ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
          ))}
        </div>
        <div className="max-h-[calc(100vh-14rem)] min-h-[420px] overflow-y-auto p-5 sm:p-7">
          {tab === 'description' ? (
            <div className="space-y-6">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed" data-testid="text-statement">{problem.statement}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Block label={isSql ? 'How it runs' : 'Input format'} text={problem.inputFormat} />
                <Block label={isSql ? 'Result format' : 'Output format'} text={problem.outputFormat} />
              </div>
              <Block label="Constraints" text={problem.constraints} />
              <div className="space-y-3">
                {problem.samples.map((sample, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-border bg-background p-3.5">
                    <p className="text-xs font-bold">Example {i + 1}</p>
                    <Block label={isSql ? 'Tables' : 'Input'} text={sample.input.trimEnd()} />
                    <Block label={isSql ? 'Expected result' : 'Output'} text={sample.output.trimEnd()} />
                  </div>
                ))}
              </div>
              <p className="flex items-center gap-1.5 font-mono-ui text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" /> Time limit: {problem.timeLimitMs} ms per {isSql ? 'dataset' : 'test'}</p>
            </div>
          ) : (
            <CodingSubmissions problemId={problem.id} bare />
          )}
        </div>
      </section>

      {/* ---------- right: editor + results ---------- */}
      <section className="min-w-0 space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
            <select value={language} onChange={(e) => changeLanguage(e.target.value)} data-testid="select-language" className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold">
              {problem.languages.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l] ?? l}</option>)}
            </select>
            <button type="button" onClick={resetCode} data-testid="button-reset-code" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"><RotateCcw className="h-3 w-3" /> Reset</button>
            <span className="ml-auto hidden font-mono-ui text-[10px] text-muted-foreground sm:block">Ctrl + Enter to run</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => changeCode(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            data-testid="input-code"
            className="block h-[380px] w-full resize-y overflow-auto whitespace-pre bg-background p-4 font-mono-ui text-[13px] leading-relaxed outline-none"
          />
          {isRemoteLanguage(language) ? <p className="border-t border-border px-4 py-2 font-mono-ui text-[10px] text-muted-foreground" data-testid="text-remote-hint">{LANGUAGE_LABELS[language] ?? language} runs on the Judge0 code runner. A run can take a few seconds.</p> : null}
          {!isSql ? (
          <div className="border-t border-border px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
              <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} data-testid="checkbox-custom-input" />
              Run with custom input instead of the samples
            </label>
            {useCustom ? <textarea value={customInput} onChange={(e) => setCustomInput(e.target.value)} spellCheck={false} data-testid="input-custom" className="mt-3 h-24 w-full rounded-lg border border-border bg-background p-3 font-mono-ui text-xs outline-none focus:ring-2 focus:ring-primary/30" /> : null}
          </div>
          ) : null}
          <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/40 px-4 py-3">
            <button type="button" onClick={run} disabled={busy} data-testid="button-run" className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-bold transition-colors hover:bg-muted disabled:opacity-60">
              {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run
            </button>
            <button type="button" onClick={submit} disabled={busy} data-testid="button-submit" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit
            </button>
          </div>
        </div>

        {panel ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm" data-testid="panel-results">
            {busy ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {runMutation.isPending ? 'Running your code...' : 'Judging against all test cases...'}</p> : null}
            {error && !busy ? <p className="rounded-lg bg-red-500/8 p-3 text-sm font-semibold text-red-700 dark:text-red-400" data-testid="text-run-error">{error}</p> : null}
            {!busy && !error && panel === 'run' && runResult ? <RunPanel result={runResult} sql={isSql} /> : null}
            {!busy && !error && panel === 'submit' && submitResult ? <SubmitPanel result={submitResult} sql={isSql} /> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default function CodingProblemPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? '';
  const query = useGetCodingProblem(slug, { query: { queryKey: getGetCodingProblemQueryKey(slug), enabled: slug !== '' } });
  const problem = query.data;

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/coding" data-testid="link-back-coding" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All problems</Link>
        {problem ? (
          <>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl" data-testid="text-problem-title">{problem.title}</h1>
            <DifficultyBadge difficulty={problem.difficulty} />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">{problem.topic}</span>
            {problem.status === 'solved' ? <VerdictBadge verdict="Accepted" /> : null}
          </>
        ) : null}
      </div>
      {query.isLoading ? <LoadingBlocks count={2} /> : null}
      {query.isError ? <QueryState error onRetry={() => void query.refetch()} label="This problem could not be loaded." /> : null}
      {/* key=slug: opening another problem starts with a fresh editor, results and tabs */}
      {problem ? <Workspace key={problem.slug} problem={problem} /> : null}
    </AppShell>
  );
}
