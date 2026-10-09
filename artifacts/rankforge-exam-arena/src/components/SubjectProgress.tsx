type Row = { subject: string; total: number; attempted: number; solved: number };

export function SubjectProgress({ subjects, attempted, solved }: { subjects: Row[]; attempted: number; solved: number }) {
  const total = subjects.reduce((n, s) => n + s.total, 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Your progress</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight" data-testid="text-progress-summary">
            {attempted} attempted · {solved} solved <span className="font-semibold text-muted-foreground">of {total}</span>
          </h2>
        </div>
        <div className="flex items-center gap-4 font-mono-ui text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Solved</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary/30" /> Attempted</span>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {subjects.map((s) => {
          const solvedPct = s.total ? (s.solved / s.total) * 100 : 0;
          const attemptedPct = s.total ? (s.attempted / s.total) * 100 : 0;
          return (
            <div key={s.subject} data-testid={`row-progress-${s.subject}`}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold">{s.subject}</span>
                <span className="font-mono-ui text-[11px] text-muted-foreground">{s.solved}/{s.total} solved · {s.attempted} tried</span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: `${attemptedPct}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${solvedPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
