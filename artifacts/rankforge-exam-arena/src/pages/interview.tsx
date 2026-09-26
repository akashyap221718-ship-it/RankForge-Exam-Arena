import { useState } from 'react';
import { ChevronDown, MessageSquareText, Sparkles } from 'lucide-react';
import { getListInterviewQuestionsQueryKey, getListInterviewRolesQueryKey, useListInterviewQuestions, useListInterviewRoles } from '@workspace/api-client-react';
import { AppShell, LoadingBlocks, PageHeader, QueryState } from '@/components/AppShell';

export default function InterviewPage() {
  const roles = useListInterviewRoles({ query: { queryKey: getListInterviewRolesQueryKey() } });
  const [role, setRole] = useState('Software Developer');
  const questions = useListInterviewQuestions({ role }, { query: { queryKey: getListInterviewQuestionsQueryKey({ role }) } });
  return (
    <AppShell>
      <PageHeader eyebrow="Interview room" title="Practice the conversation before it counts." description="Role-focused prompts for technical fundamentals, case thinking, and the behavioral moments that decide whether preparation feels real." action={<div className="relative"><select value={role} onChange={(event) => setRole(event.target.value)} className="appearance-none rounded-xl border border-border bg-card px-4 py-2.5 pr-10 text-sm font-bold"><option value="">All roles</option>{(roles.data ?? []).map((item) => <option key={item.role}>{item.role}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" /></div>} />
      {roles.isLoading ? <LoadingBlocks count={3} /> : <div className="mb-7 grid gap-4 md:grid-cols-3">{(roles.data ?? []).map((item) => <button key={item.role} type="button" onClick={() => setRole(item.role)} className={`rounded-2xl border p-5 text-left transition-colors ${role === item.role ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">{item.questionCount} prompts</p><h2 className="mt-2 font-extrabold">{item.role}</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.categories.join(' · ')}</p></button>)}</div>}
      <QueryState error={questions.isError} onRetry={() => void questions.refetch()} label="The interview room is unavailable." />
      {questions.isLoading ? <LoadingBlocks count={3} /> : <div className="space-y-4">{(questions.data ?? []).map((item, index) => <article key={item.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/20 text-accent-foreground"><MessageSquareText className="h-4 w-4" /></div><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">{item.category}</span></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{item.difficulty}</span></div><h2 className="mt-5 text-lg font-extrabold">{index + 1}. {item.prompt}</h2><details className="mt-4 rounded-xl border border-border bg-background p-4"><summary className="flex cursor-pointer items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-accent-foreground" /> Reveal answer guide</summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answerGuide}</p></details></article>)}</div>}
    </AppShell>
  );
}