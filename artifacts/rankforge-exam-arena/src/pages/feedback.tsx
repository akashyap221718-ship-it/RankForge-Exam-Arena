import { useState } from 'react';
import { CheckCircle2, MessageSquareWarning, Send } from 'lucide-react';
import { useCreateFeedback } from '@workspace/api-client-react';
import { AppShell, PageHeader } from '@/components/AppShell';

const categories = ['General feedback', 'Feature request', 'UI/UX feedback', 'Learning content feedback', 'Website bug', 'Login problem', 'Profile problem', 'Coding problem issue', 'Payment issue', 'Content issue', 'Job listing issue', 'Other'];

export default function FeedbackPage() {
  const createFeedback = useCreateFeedback();
  const [category, setCategory] = useState(categories[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const submit = () => {
    createFeedback.mutate({ data: { category, subject, description } }, { onSuccess: () => { setSent(true); setSubject(''); setDescription(''); } });
  };
  return (
    <AppShell>
      <PageHeader eyebrow="Direct line" title="Tell us what needs attention." description="Feedback is attached to your authenticated account and stored for review. Be specific enough that someone can reproduce the issue." />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_.7fr]"><section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><MessageSquareWarning className="h-5 w-5" /></div><div><h2 className="text-lg font-extrabold">New submission</h2><p className="text-sm text-muted-foreground">Choose the closest signal type.</p></div></div><label className="mt-7 block font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-semibold">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-5 block font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Short description of the issue" className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" /></label><label className="mt-5 block font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={7} placeholder="What happened, and what did you expect?" className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary" /></label><button type="button" onClick={submit} disabled={createFeedback.isPending || !subject.trim() || !description.trim()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /> {createFeedback.isPending ? 'Sending' : 'Send submission'}</button>{sent && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Submission received. Thank you for the signal.</p>}</section><aside className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-xl"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-accent">What happens next</p><h2 className="mt-3 text-xl font-extrabold text-white">A traceable review, not a black hole.</h2><ul className="mt-6 space-y-4 text-sm leading-relaxed text-sidebar-foreground/70"><li>Every submission is linked to your account and timestamped.</li><li>Reviews move through New, In Progress, Resolved, and Closed.</li><li>Never include passwords, API keys, or other private credentials.</li></ul></aside></div>
    </AppShell>
  );
}