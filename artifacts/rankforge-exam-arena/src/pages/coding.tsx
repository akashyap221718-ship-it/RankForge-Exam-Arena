import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Circle, CircleDot, Search } from 'lucide-react';
import { getListCodingProblemsQueryKey, useListCodingProblems } from '@workspace/api-client-react';
import { AppShell, LoadingBlocks, PageHeader, QueryState } from '@/components/AppShell';
import { CodingSubmissions } from '@/components/CodingSubmissions';
import { DifficultyBadge } from '@/components/CodingBadges';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'] as const;
const STATUSES = [
  { value: 'all', label: 'All status' },
  { value: 'todo', label: 'Todo' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'solved', label: 'Solved' },
] as const;

function StatusIcon({ status }: { status: string }) {
  if (status === 'solved') return <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" aria-label="Solved" />;
  if (status === 'attempted') return <CircleDot className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" aria-label="Attempted" />;
  return <Circle className="h-[18px] w-[18px] text-muted-foreground/50" aria-label="Todo" />;
}

export default function CodingPage() {
  const query = useListCodingProblems(undefined, { query: { queryKey: getListCodingProblemsQueryKey() } });
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('All');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const problems = query.data ?? [];
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return problems.filter(
      (p) =>
        (difficulty === 'All' || p.difficulty === difficulty) &&
        (status === 'all' || p.status === status) &&
        (!term || p.title.toLowerCase().includes(term) || p.topic.toLowerCase().includes(term)),
    );
  }, [problems, difficulty, status, search]);

  const summary = (level: string) => {
    const all = problems.filter((p) => p.difficulty === level);
    return { solved: all.filter((p) => p.status === 'solved').length, total: all.length };
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Coding arena" title="Practice problems" description="Write a program, run it on the sample tests, then submit it against hidden tests. Programs read from stdin and print to stdout." />
      {query.isError ? <QueryState error onRetry={() => void query.refetch()} label="The problem set could not be loaded." /> : null}
      {query.isLoading ? <LoadingBlocks count={3} /> : null}
      {query.data ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-4" data-testid="coding-summary">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Solved</p>
              <p className="mt-1.5 text-2xl font-extrabold">{problems.filter((p) => p.status === 'solved').length}<span className="text-sm font-semibold text-muted-foreground"> / {problems.length}</span></p>
            </div>
            {(['Easy', 'Medium', 'Hard'] as const).map((level) => {
              const s = summary(level);
              return (
                <div key={level} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">{level}</p>
                  <p className="mt-1.5 text-2xl font-extrabold">{s.solved}<span className="text-sm font-semibold text-muted-foreground"> / {s.total}</span></p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <div className="flex gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button key={d} type="button" onClick={() => setDifficulty(d)} data-testid={`filter-difficulty-${d}`} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${difficulty === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{d}</button>
                ))}
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="filter-status" className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="relative ml-auto w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or topic" data-testid="input-search-problems" className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border font-mono-ui text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                    <th className="w-12 px-4 py-3 font-semibold">Status</th>
                    <th className="px-2 py-3 font-semibold">Title</th>
                    <th className="px-2 py-3 font-semibold">Topic</th>
                    <th className="px-2 py-3 text-right font-semibold">Acceptance</th>
                    <th className="px-4 py-3 text-right font-semibold">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/50" data-testid={`row-problem-${p.slug}`}>
                      <td className="px-4 py-3"><StatusIcon status={p.status} /></td>
                      <td className="px-2 py-3"><Link href={`/coding/${p.slug}`} className="font-bold hover:text-primary hover:underline">{p.title}</Link></td>
                      <td className="px-2 py-3 text-muted-foreground">{p.topic}</td>
                      <td className="px-2 py-3 text-right font-mono-ui text-xs text-muted-foreground">{p.acceptance < 0 ? '-' : `${p.acceptance}%`}</td>
                      <td className="px-4 py-3 text-right"><DifficultyBadge difficulty={p.difficulty} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visible.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No problems match these filters.</p> : null}
            </div>
          </div>
        </>
      ) : null}
      <CodingSubmissions showProblem />
    </AppShell>
  );
}
