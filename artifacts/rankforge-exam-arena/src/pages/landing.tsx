import { ArrowRight, BookOpenCheck, Shield, Swords, Trophy } from 'lucide-react';
import { Link } from 'wouter';

const pillars = [
  { icon: BookOpenCheck, title: 'Exam-native practice', copy: 'Engineering and government-job questions built around the patterns that actually repeat.' },
  { icon: Swords, title: 'Pressure that helps', copy: 'Timed sets and contests turn preparation into a clean, measurable training loop.' },
  { icon: Trophy, title: 'A rank you can read', copy: 'See your rating, percentile, streak, and the next topic worth your attention.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3" data-testid="link-public-brand">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20">
            <Shield className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight">RANKFORGE</div>
            <div className="font-mono-ui text-[9px] uppercase tracking-[.2em] text-muted-foreground">exam arena</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" data-testid="link-public-sign-in" className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Sign in</Link>
          <Link href="/sign-up" data-testid="link-public-sign-up" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-transform hover:-translate-y-0.5">Create account</Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
        <div className="max-w-3xl stagger-in">
          <div className="mb-4 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Competitive preparation, without the noise
          </div>
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[.98] tracking-[-.06em] sm:text-7xl">
            Make every solved question move your <span className="text-primary">rank.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            RankForge is a focused training arena for GATE, ESE, SSC, and other government-job exams. Practice engineering concepts, build exam speed, and see exactly where your work places you.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" data-testid="link-hero-sign-up" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-transform hover:-translate-y-0.5">
              Start your training log <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/sign-in" data-testid="link-hero-sign-in" className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold transition-colors hover:bg-muted">
              I already have an account
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, copy }, index) => (
            <div key={title} className={`stagger-in stagger-${index + 2} rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur`}>
              <div className="mb-8 grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Icon className="h-5 w-5" /></div>
              <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}