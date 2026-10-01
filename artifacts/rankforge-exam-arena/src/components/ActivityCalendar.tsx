import { useMemo, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';

type Day = { date: string; count: number };

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Bucket raw attempt counts into 5 intensity steps, GitHub/LeetCode style.
function intensityClass(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count === 1) return 'bg-primary/30';
  if (count === 2) return 'bg-primary/55';
  if (count <= 4) return 'bg-primary/80';
  return 'bg-primary';
}

// Group a flat list of days (oldest first) into GitHub-style week columns,
// left-padding the first week so each column always starts on Sunday.
function toWeeks(days: Day[]): (Day | null)[][] {
  if (days.length === 0) return [];
  const firstDow = new Date(`${days[0]!.date}T00:00:00Z`).getUTCDay();
  const padded: (Day | null)[] = [...Array(firstDow).fill(null), ...days];
  const weeks: (Day | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  return weeks;
}

export function ActivityCalendar({ days, currentStreak, longestStreak }: { days: Day[]; currentStreak: number; longestStreak: number }) {
  const [hovered, setHovered] = useState<Day | null>(null);
  const weeks = useMemo(() => toWeeks(days), [days]);
  const totalActive = useMemo(() => days.filter((d) => d.count > 0).length, [days]);

  const monthLabels = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstReal = week.find((d) => d !== null);
      if (!firstReal) return;
      const month = new Date(`${firstReal.date}T00:00:00Z`).getUTCMonth();
      if (month !== lastMonth) {
        labels.push({ week: weekIndex, label: MONTH_LABELS[month]! });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="stagger-in stagger-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Practice log</p>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight">{totalActive} active days in the last year</h2>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/25 text-[#ab7600]"><Flame className="h-4 w-4" /></div>
            <div><p className="text-sm font-extrabold leading-tight">{currentStreak} day{currentStreak === 1 ? '' : 's'}</p><p className="font-mono-ui text-[10px] text-muted-foreground">Current streak</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Trophy className="h-4 w-4" /></div>
            <div><p className="text-sm font-extrabold leading-tight">{longestStreak} day{longestStreak === 1 ? '' : 's'}</p><p className="font-mono-ui text-[10px] text-muted-foreground">Longest streak</p></div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full flex-col gap-1.5" style={{ minWidth: `${weeks.length * 14 + 32}px` }}>
          <div className="ml-8 flex gap-[3px]">
            {weeks.map((_, weekIndex) => {
              const label = monthLabels.find((m) => m.week === weekIndex);
              return <span key={weekIndex} className="w-[11px] shrink-0 font-mono-ui text-[9px] text-muted-foreground">{label?.label ?? ''}</span>;
            })}
          </div>
          <div className="flex gap-[3px]">
            <div className="mr-1 flex w-7 shrink-0 flex-col gap-[3px]">
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={index} className="h-[11px] font-mono-ui text-[9px] leading-[11px] text-muted-foreground">{label}</span>
              ))}
            </div>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex shrink-0 flex-col gap-[3px]">
                {week.map((day, dayIndex) =>
                  day ? (
                    <button
                      type="button"
                      key={day.date}
                      data-testid={`cell-activity-${day.date}`}
                      onMouseEnter={() => setHovered(day)}
                      onMouseLeave={() => setHovered((current) => (current?.date === day.date ? null : current))}
                      className={`h-[11px] w-[11px] rounded-[2px] transition-transform hover:scale-125 ${intensityClass(day.count)}`}
                    />
                  ) : (
                    <span key={dayIndex} className="h-[11px] w-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="font-mono-ui text-[10px] text-muted-foreground" data-testid="text-activity-hover">
          {hovered ? `${hovered.count} question${hovered.count === 1 ? '' : 's'} · ${new Date(`${hovered.date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Hover a square to see that day'}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="font-mono-ui text-[9px] text-muted-foreground">Less</span>
          {['bg-muted', 'bg-primary/30', 'bg-primary/55', 'bg-primary/80', 'bg-primary'].map((cls) => (
            <span key={cls} className={`h-[11px] w-[11px] rounded-[2px] ${cls}`} />
          ))}
          <span className="font-mono-ui text-[9px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}
