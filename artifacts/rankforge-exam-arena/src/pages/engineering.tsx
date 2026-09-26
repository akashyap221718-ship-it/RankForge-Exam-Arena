import { useState } from 'react';
import { ArrowUpRight, BookOpenCheck, Search } from 'lucide-react';
import { getListEngineeringMaterialsQueryKey, useListEngineeringMaterials } from '@workspace/api-client-react';
import { AppShell, LoadingBlocks, PageHeader, QueryState } from '@/components/AppShell';

export default function EngineeringPage() {
  const [branch, setBranch] = useState('');
  const query = useListEngineeringMaterials({ branch: branch || undefined }, { query: { queryKey: getListEngineeringMaterialsQueryKey({ branch: branch || undefined }) } });
  const materials = query.data ?? [];
  return (
    <AppShell>
      <PageHeader eyebrow="Engineering library" title="Study the subjects that move your exam score." description="Original notes, formulas, and practice directions across the major engineering branches. Mark the topics you want to return to next." action={<label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5"><Search className="h-4 w-4 text-muted-foreground" /><input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="Filter by branch" className="w-44 bg-transparent text-xs outline-none" /></label>} />
      <QueryState error={query.isError} onRetry={() => void query.refetch()} label="The engineering library is unavailable." />
      {query.isLoading ? <LoadingBlocks count={4} /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{materials.map((material) => <article key={material.id} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"><div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-2.5 py-1 font-mono-ui text-[10px] uppercase tracking-wider text-primary">{material.branch}</span><BookOpenCheck className="h-5 w-5 text-primary" /></div><p className="mt-5 font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">{material.subject}</p><h2 className="mt-2 text-xl font-extrabold tracking-tight">{material.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{material.summary}</p><div className="mt-5 flex flex-wrap gap-2">{material.topics.map((topic) => <span key={topic} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{topic}</span>)}</div><button type="button" className="mt-6 flex items-center gap-1 text-sm font-bold text-primary transition-all group-hover:gap-2">Open material <ArrowUpRight className="h-4 w-4" /></button></article>)}</div>}
    </AppShell>
  );
}