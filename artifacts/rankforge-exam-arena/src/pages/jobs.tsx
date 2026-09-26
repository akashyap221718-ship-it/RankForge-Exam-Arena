import { useState } from 'react';
import { BriefcaseBusiness, ExternalLink, Filter, MapPin, Search } from 'lucide-react';
import { getListJobsQueryKey, useListJobs } from '@workspace/api-client-react';
import { AppShell, LoadingBlocks, PageHeader, QueryState } from '@/components/AppShell';

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [workType, setWorkType] = useState('');
  const [location, setLocation] = useState('');
  const params = { search: search || undefined, workType: workType || undefined, location: location || undefined };
  const query = useListJobs(params, { query: { queryKey: getListJobsQueryKey(params) } });
  const jobs = query.data ?? [];

  return (
    <AppShell>
      <PageHeader eyebrow="Career radar" title="Find the next serious opportunity." description="RankForge only shows listings that have been added from a verified source. No invented openings, no inflated counts." />
      <section className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5"><Search className="h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles or companies" className="w-full bg-transparent text-sm outline-none" /></label>
          <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 lg:w-52"><Filter className="h-4 w-4 text-muted-foreground" /><select value={workType} onChange={(event) => setWorkType(event.target.value)} className="w-full bg-transparent text-sm outline-none"><option value="">All work types</option><option>Internship</option><option>Full-time</option><option>Remote</option><option>Hybrid</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 lg:w-52"><MapPin className="h-4 w-4 text-muted-foreground" /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" className="w-full bg-transparent text-sm outline-none" /></label>
        </div>
      </section>
      <QueryState error={query.isError} onRetry={() => void query.refetch()} label="The jobs feed is unavailable." />
      {query.isLoading ? <LoadingBlocks count={3} /> : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <BriefcaseBusiness className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-extrabold">No verified listings match yet.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">The jobs structure is ready for legitimate listings and external feeds, but RankForge will not manufacture opportunities to make this page look busy.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">{job.company}</p><h2 className="mt-2 text-xl font-extrabold">{job.title}</h2></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{job.workType}</span></div>
              <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {job.location} · {job.experienceRequired}</p>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">{job.requiredSkills.map((skill) => <span key={skill} className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">{skill}</span>)}</div>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4"><span className="text-xs text-muted-foreground">Updated {new Date(job.updatedAt).toLocaleDateString()}</span><a href={job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">View source <ExternalLink className="h-4 w-4" /></a></div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}