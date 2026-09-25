import { ArrowUpRight, BrainCircuit, Check, ChevronRight, Clock3, Crosshair, Flame, Gauge, Medal, Target, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { getGetDashboardQueryKey, useGetDashboard } from '@workspace/api-client-react';
import { AppShell, LoadingBlocks, MetricDelta, QueryState } from '@/components/AppShell';

const fallbackFocus = [
  { name: 'Data interpretation', subtitle: 'Quantitative aptitude', progress: 72, color: '#e0a928' },
  { name: 'Network layers', subtitle: 'Computer science', progress: 48, color: '#5668c9' },
  { name: 'Logical reasoning', subtitle: 'General aptitude', progress: 86, color: '#319675' },
];

export default function DashboardPage() {
  const query = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const dashboard = query.data;

  return (
    <AppShell>
      <div className="mb-9 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="stagger-in">
          <p className="mb-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">Tuesday · training log 042</p>
          <h1 className="text-3xl font-extrabold tracking-[-.05em] sm:text-5xl">Good to see you, <span className="text-primary">{dashboard?.user.name?.split(' ')[0] ?? 'learner'}.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Your next rank is not far away. Put in one honest set and let the compounding do the work.</p>
        </div>
        <div className="stagger-in stagger-2 flex items-center gap-3 self-start rounded-2xl border border-border bg-card px-4 py-3 shadow-sm md:self-auto">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/20 text-accent-foreground"><Flame className="h-5 w-5 text-[#c58c09]" /></div>
          <div><p className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Current streak</p><p className="text-xl font-extrabold">{dashboard?.user.streak ?? 12} <span className="text-xs font-semibold text-muted-foreground">days</span></p></div>
          <div className="ml-2 h-8 w-px bg-border" />
          <div className="font-mono-ui text-xs text-muted-foreground">+1 today</div>
        </div>
      </div>

      <QueryState error={query.isError} onRetry={() => void query.refetch()} />
      {query.isLoading ? <LoadingBlocks count={4} /> : dashboard && (
        <>
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="stagger-in stagger-1 relative col-span-2 overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/15 md:col-span-1 xl:col-span-2">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[18px] border-white/10" />
              <div className="relative"><div className="mb-6 flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary-foreground/60">Global rank</span><Medal className="h-5 w-5 text-accent" /></div><p className="text-4xl font-extrabold tracking-[-.05em]">#{dashboard.user.rank.toLocaleString()}</p><p className="mt-2 text-xs text-primary-foreground/65">Top {dashboard.user.percentile}% of active learners</p><div className="mt-6 h-1 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[76%] rounded-full bg-accent" /></div></div>
            </div>
            <MetricCard icon={Check} label="Problems solved" value={dashboard.stats.solved.toLocaleString()} delta={dashboard.stats.solvedDelta} className="stagger-2" />
            <MetricCard icon={Target} label="Accuracy" value={`${dashboard.stats.accuracy}%`} delta={dashboard.stats.accuracyDelta} suffix=" pts" className="stagger-3" />
            <MetricCard icon={Gauge} label="Forge rating" value={dashboard.stats.rating.toLocaleString()} delta={dashboard.stats.ratingDelta} suffix=" pts" className="stagger-4" />
            <MetricCard icon={Clock3} label="Focus hours" value={`${dashboard.stats.hours}h`} delta={dashboard.stats.hoursDelta} suffix="h" className="stagger-5" />
          </section>

          <section className="mt-7 grid gap-7 xl:grid-cols-[1.1fr_.9fr]">
            <div className="stagger-in stagger-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
              <div className="mb-7 flex items-start justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Calibration map</p><h2 className="mt-2 text-xl font-extrabold tracking-tight">Your focus topics</h2></div><Link href="/practice" data-testid="link-focus-practice" className="flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all">Practice map <ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
              <div className="space-y-6">{(dashboard.focus?.length ? dashboard.focus : fallbackFocus).map((topic, index) => <div key={topic.name} data-testid={`row-focus-topic-${index}`}><div className="mb-2 flex items-end justify-between gap-3"><div><p className="text-sm font-bold">{topic.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{topic.subtitle}</p></div><span className="font-mono-ui text-xs font-medium text-foreground">{topic.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full origin-left rounded-full transition-transform duration-700" style={{ width: `${topic.progress}%`, backgroundColor: topic.color }} /></div></div>)}</div>
            </div>
            <div className="stagger-in stagger-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
              <div className="mb-7 flex items-start justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Signal feed</p><h2 className="mt-2 text-xl font-extrabold tracking-tight">Recent activity</h2></div><div className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><TrendingUp className="h-4 w-4 text-primary" /></div></div>
              <div className="space-y-1">{dashboard.recentActivity.slice(0, 5).map((activity, index) => <div key={`${activity.title}-${index}`} data-testid={`row-recent-activity-${index}`} className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/70"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${activity.kind === 'contest' ? 'bg-accent/25 text-[#ab7600]' : 'bg-primary/10 text-primary'}`}>{activity.kind === 'contest' ? <Zap className="h-4 w-4" /> : <Check className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{activity.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{activity.meta}</p></div><span className="font-mono-ui text-xs font-medium text-emerald-600">+{activity.points}</span></div>)}</div>
            </div>
          </section>

          <section className="stagger-in stagger-5 mt-7 overflow-hidden rounded-2xl bg-[#e9edf8] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center"><div className="flex items-start gap-4"><div className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><BrainCircuit className="h-5 w-5" /></div><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">Recommended next</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight">Quant sprint · percentages</h2><p className="mt-2 max-w-lg text-sm text-muted-foreground">12 questions · medium pressure · estimated 18 minutes. Built around the gaps in your last three attempts.</p></div></div><Link href="/practice" data-testid="link-start-recommended" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-all hover:-translate-y-0.5 hover:shadow-xl">Enter practice room <ChevronRight className="h-4 w-4" /></Link></div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function MetricCard({ icon: Icon, label, value, delta, suffix = '%', className = '' }: { icon: typeof Check; label: string; value: string; delta: number; suffix?: string; className?: string }) {
  return <div className={`stagger-in ${className} rounded-2xl border border-border bg-card p-5 shadow-sm`}><div className="mb-5 flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-[.14em] text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div><p className="text-2xl font-extrabold tracking-[-.04em]">{value}</p><div className="mt-2 flex items-center gap-2"><MetricDelta value={delta} suffix={suffix} /><span className="text-[10px] text-muted-foreground">this week</span></div></div>;
}