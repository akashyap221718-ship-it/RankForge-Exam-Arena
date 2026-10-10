import { Link } from 'wouter';
import { History } from 'lucide-react';
import { getListCodingSubmissionsQueryKey, useListCodingSubmissions } from '@workspace/api-client-react';
import { VerdictBadge } from '@/components/CodingBadges';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function CodingSubmissions({ problemId, showProblem = false, bare = false }: { problemId?: number; showProblem?: boolean; bare?: boolean }) {
  const params = problemId === undefined ? undefined : { problemId };
  const query = useListCodingSubmissions(params, { query: { queryKey: getListCodingSubmissionsQueryKey(params) } });
  const items = query.data ?? [];

  const body = (
    <>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading your submissions...</p> : null}
      {query.isError ? <p className="text-sm text-destructive">Could not load your submissions.</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? <p className="text-sm text-muted-foreground">No submissions yet. Solve a problem and it will show up here.</p> : null}
      <div className="space-y-3">
        {items.map((item) => (
          <details key={item.id} className="group rounded-xl border border-border bg-background p-4" data-testid={`row-submission-${item.id}`}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1.5">
              <VerdictBadge verdict={item.verdict} />
              {showProblem ? <Link href={`/coding/${item.problemSlug}`} className="font-bold hover:underline" onClick={(e) => e.stopPropagation()}>{item.problemTitle}</Link> : null}
              <span className="font-mono-ui text-[11px] text-muted-foreground">{item.passed}/{item.total} tests</span>
              <span className="font-mono-ui text-[11px] text-muted-foreground">{item.runtimeMs} ms</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{item.language}</span>
              <span className="ml-auto font-mono-ui text-[11px] text-muted-foreground">{formatWhen(item.createdAt)}</span>
            </summary>
            {item.errorMessage ? <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-red-500/8 p-3 font-mono-ui text-xs text-red-700 dark:text-red-400">{item.errorMessage}</pre> : null}
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-card p-3 font-mono-ui text-xs leading-relaxed">{item.sourceCode}</pre>
          </details>
        ))}
      </div>
    </>
  );

  if (bare) return <div data-testid="section-my-submissions">{body}</div>;
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7" data-testid="section-my-submissions">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><History className="h-4 w-4" /></div>
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Your history</p>
          <h2 className="text-lg font-extrabold tracking-tight">Recent submissions <span className="font-semibold text-muted-foreground">({items.length})</span></h2>
        </div>
      </div>
      {body}
    </section>
  );
}
