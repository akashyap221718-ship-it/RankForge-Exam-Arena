import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpenCheck, ChevronRight, Flame, LayoutDashboard, Menu, Settings2, Shield, Swords, Trophy, X } from 'lucide-react';
import { getHealthCheckQueryKey, useHealthCheck } from '@workspace/api-client-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/practice', label: 'Practice room', icon: BookOpenCheck },
  { href: '/contests', label: 'Contests', icon: Swords },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 30_000 } });
  const active = (href: string) => href === '/' ? location === '/' : location.startsWith(href);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-7">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/10">
            <Shield className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-white">RANKFORGE</div>
            <div className="font-mono-ui text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/55">exam arena</div>
          </div>
        </div>
        <div className="px-4 pt-8">
          <p className="px-3 pb-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-sidebar-foreground/40">Training room</p>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${active(href) ? 'bg-sidebar-accent text-accent' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-white'}`}
              >
                <Icon className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-105 ${active(href) ? 'text-accent' : ''}`} />
                <span>{label}</span>
                {active(href) && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div data-testid="status-api-health" className="mb-3 flex items-center gap-2 px-2 font-mono-ui text-[9px] uppercase tracking-[.16em] text-sidebar-foreground/45"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-destructive' : 'bg-emerald-500'}`} /> {health.isError ? 'Signal interrupted' : 'Arena online'}</div>
          <div className="scanline overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-accent/65 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/55">Daily charge</span>
              <Flame className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-semibold text-white">Keep the chain alive.</p>
            <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/55">One focused set beats a scattered hour.</p>
            <Link href="/practice" data-testid="link-sidebar-start-set" className="mt-4 flex items-center justify-between rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground transition-transform hover:-translate-y-0.5">
              Start a set <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Link href="/settings" data-testid="link-nav-settings" className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-white">
            <Settings2 className="h-[18px] w-[18px]" /> Settings
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} data-testid="button-open-menu" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" data-testid="link-mobile-brand" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground"><Shield className="h-4 w-4" /></div>
          <span className="text-sm font-extrabold tracking-tight">RANKFORGE</span>
        </Link>
        <Link href="/settings" data-testid="link-mobile-settings" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Settings2 className="h-5 w-5" /></Link>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} data-testid="button-close-menu" className="absolute inset-0 bg-sidebar/60" />
          <aside className="relative flex h-full w-[280px] flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
            <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-6">
              <span className="text-[15px] font-extrabold tracking-tight text-white">RANKFORGE</span>
              <button type="button" onClick={() => setMobileOpen(false)} data-testid="button-dismiss-menu" className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent"><X className="h-5 w-5" /></button>
            </div>
            <nav className="space-y-1 px-4 pt-7">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active(href) ? 'bg-sidebar-accent text-accent' : 'text-sidebar-foreground/70'}`}>
                  <Icon className="h-[18px] w-[18px]" /> {label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <main className="min-h-[100dvh] lg:pl-[252px]">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 lg:px-12 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="stagger-in">
        <div className="mb-2 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {eyebrow}
        </div>
        <h1 className="text-3xl font-extrabold tracking-[-.04em] text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="stagger-in stagger-2">{action}</div>}
    </div>
  );
}

export function LoadingBlocks({ count = 3 }: { count?: number }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: count }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div>;
}

export function QueryState({ error, onRetry, label = 'This room is taking a breather.' }: { error?: boolean; onRetry?: () => void; label?: string }) {
  if (!error) return null;
  return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
      <p className="font-semibold text-destructive">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">Check the connection, then try again.</p>
      {onRetry && <button type="button" onClick={onRetry} data-testid="button-retry-query" className="mt-4 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background hover:opacity-90">Retry</button>}
    </div>
  );
}

export function MetricDelta({ value, suffix = '%' }: { value: number; suffix?: string }) {
  return <span className={`font-mono-ui text-[10px] font-medium ${value >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{value >= 0 ? '+' : ''}{value}{suffix}</span>;
}