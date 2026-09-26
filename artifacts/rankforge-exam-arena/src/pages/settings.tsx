import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Award,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Laptop,
  LoaderCircle,
  Mail,
  Moon,
  Phone,
  Save,
  Sun,
  Target,
  UserRound,
} from 'lucide-react';
import {
  getGetDashboardQueryKey,
  getGetLeaderboardQueryKey,
  getGetProfileQueryKey,
  type Profile,
  type ProfileUpdate,
  useGetProfile,
  useUpdateProfile,
} from '@workspace/api-client-react';
import { AppShell, PageHeader, QueryState } from '@/components/AppShell';
import { useTheme } from '@/components/theme-provider';

type FormState = {
  fullName: string;
  username: string;
  phoneNumber: string;
  college: string;
  course: string;
  branch: string;
  year: string;
  graduationYear: string;
  skills: string[];
  programmingLanguages: string[];
  interests: string[];
  careerGoal: string;
  preferredJobRole: string;
  learningGoals: string;
  skillLevel: string;
  targetCompanies: string[];
};

const emptyForm: FormState = {
  fullName: '',
  username: '',
  phoneNumber: '',
  college: '',
  course: '',
  branch: '',
  year: '',
  graduationYear: '',
  skills: [],
  programmingLanguages: [],
  interests: [],
  careerGoal: '',
  preferredJobRole: '',
  learningGoals: '',
  skillLevel: '',
  targetCompanies: [],
};

const skillOptions = ['Problem solving', 'Data structures', 'Algorithms', 'System design', 'Database design', 'Communication', 'Aptitude'];
const languageOptions = ['C++', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'SQL', 'Rust'];
const interestOptions = ['Competitive programming', 'Web development', 'Data science', 'Cybersecurity', 'Cloud engineering', 'Public policy', 'Research'];
const companyOptions = ['Google', 'Microsoft', 'Amazon', 'Adobe', 'Atlassian', 'ISRO', 'DRDO', 'UPSC'];
const careerOptions = ['Software engineering', 'Civil services', 'Public sector technology', 'Research and higher studies', 'Product engineering'];
const roleOptions = ['Backend engineer', 'Frontend engineer', 'Full-stack engineer', 'Data engineer', 'Government officer', 'Security analyst', 'Research engineer'];
const levelOptions = ['Starting out', 'Building foundations', 'Interview ready', 'Advanced'];
const yearOptions = ['First year', 'Second year', 'Third year', 'Final year', 'Graduate', 'Working professional'];

function formFromProfile(profile: Profile): FormState {
  return {
    fullName: profile.fullName ?? '',
    username: profile.username ?? '',
    phoneNumber: profile.phoneNumber ?? '',
    college: profile.college ?? '',
    course: profile.course ?? '',
    branch: profile.branch ?? '',
    year: profile.year ?? '',
    graduationYear: profile.graduationYear?.toString() ?? '',
    skills: profile.skills ?? [],
    programmingLanguages: profile.programmingLanguages ?? [],
    interests: profile.interests ?? [],
    careerGoal: profile.careerGoal ?? '',
    preferredJobRole: profile.preferredJobRole ?? '',
    learningGoals: profile.learningGoals ?? '',
    skillLevel: profile.skillLevel ?? '',
    targetCompanies: profile.targetCompanies ?? [],
  };
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RF';
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const profileQuery = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [initializedProfileKey, setInitializedProfileKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null);
  const [target, setTarget] = useState('UPSC CSE');
  const [dailyGoal, setDailyGoal] = useState('45');
  const [notifications, setNotifications] = useState(true);
  const [compact, setCompact] = useState(false);
  const profileKey = profileQuery.data?.email ?? null;

  useEffect(() => {
    if (profileQuery.data && profileKey && initializedProfileKey !== profileKey) {
      setForm(formFromProfile(profileQuery.data));
      setInitializedProfileKey(profileKey);
    }
  }, [initializedProfileKey, profileKey]);

  const profile = profileQuery.data;
  const completion = profile?.profileCompletion ?? 0;
  const displayName = form.fullName || profile?.fullName || 'Your learner profile';
  const completionLabel = completion >= 80 ? 'Strong profile signal' : completion >= 45 ? 'Good start, keep building' : 'A few details unlock better recommendations';

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFeedback(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = () => {
    const payload: ProfileUpdate = {
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      phoneNumber: form.phoneNumber.trim() || null,
      college: form.college.trim() || null,
      course: form.course.trim() || null,
      branch: form.branch.trim() || null,
      year: form.year || null,
      graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
      skills: form.skills,
      programmingLanguages: form.programmingLanguages,
      interests: form.interests,
      careerGoal: form.careerGoal || null,
      preferredJobRole: form.preferredJobRole || null,
      learningGoals: form.learningGoals.trim() || null,
      skillLevel: form.skillLevel || null,
      targetCompanies: form.targetCompanies,
    };

    updateProfile.mutate({ data: payload }, {
      onSuccess: (savedProfile) => {
        setForm(formFromProfile(savedProfile));
        setFeedback('saved');
        setInitializedProfileKey(savedProfile.email);
        void queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
      },
      onError: () => setFeedback('error'),
    });
  };

  if (profileQuery.isLoading) return <AppShell><SettingsSkeleton /></AppShell>;
  if (profileQuery.isError || !profile) {
    return <AppShell><PageHeader eyebrow="Control room" title="Your profile is offline." description="We could not load the learner profile for this training room." /><QueryState error onRetry={() => void profileQuery.refetch()} label="Profile signal interrupted." /></AppShell>;
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Control room / profile"
        title="Tune the learner behind the rank."
        description="Your profile choices shape the practice sets, role signals, and leaderboard context you see next."
        action={<SaveButton isPending={updateProfile.isPending} onClick={saveProfile} testId="button-save-settings-top" />}
      />

      <div className="grid max-w-[1180px] gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-primary/[0.04] px-5 py-5 sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div>
                  <div>
                    <p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">Identity dossier</p>
                    <h2 className="mt-1 text-lg font-extrabold tracking-tight">Make the arena know your direction.</h2>
                  </div>
                </div>
                <ProfileStatus feedback={feedback} />
              </div>
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
              <Field label="Full name" value={form.fullName} onChange={(value) => updateField('fullName', value)} placeholder="How should we call you?" testId="input-full-name" />
              <Field label="Username" value={form.username} onChange={(value) => updateField('username', value)} placeholder="Your public handle" prefix="@" testId="input-username" />
              <ReadOnlyField label="Email address" value={profile.email} icon={Mail} testId="text-profile-email" />
              <ReadOnlyField label="Clerk avatar" value={profile.avatarUrl ? 'Connected to your account' : 'Initials fallback active'} icon={Award} testId="text-profile-avatar" />
              <Field label="Phone number" value={form.phoneNumber} onChange={(value) => updateField('phoneNumber', value)} placeholder="+91 98765 43210" icon={Phone} testId="input-phone-number" />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <SectionHeading icon={GraduationCap} eyebrow="Academic track" title="Give your practice context." description="These details help RankForge calibrate examples and pathways around where you are now." />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="College or institute" value={form.college} onChange={(value) => updateField('college', value)} placeholder="e.g. NIT Trichy" testId="input-college" />
              <Field label="Course" value={form.course} onChange={(value) => updateField('course', value)} placeholder="e.g. B.Tech" testId="input-course" />
              <Field label="Branch" value={form.branch} onChange={(value) => updateField('branch', value)} placeholder="e.g. Computer Science" testId="input-branch" />
              <SelectField label="Current stage" value={form.year} options={yearOptions} onChange={(value) => updateField('year', value)} testId="select-year" />
              <Field label="Graduation year" value={form.graduationYear} onChange={(value) => updateField('graduationYear', value.replace(/\D/g, '').slice(0, 4))} placeholder="2027" inputMode="numeric" testId="input-graduation-year" />
              <SelectField label="Skill level" value={form.skillLevel} options={levelOptions} onChange={(value) => updateField('skillLevel', value)} testId="select-skill-level" />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <SectionHeading icon={Laptop} eyebrow="Working toolkit" title="Choose what you want to sharpen." description="Select the signals that should influence your recommended sets. Add a custom signal when your path is more specific." />
            <div className="space-y-7">
              <ChipGroup label="Core skills" value={form.skills} options={skillOptions} onChange={(value) => updateField('skills', value)} testPrefix="skill" />
              <ChipGroup label="Programming languages" value={form.programmingLanguages} options={languageOptions} onChange={(value) => updateField('programmingLanguages', value)} testPrefix="language" />
              <ChipGroup label="Areas of interest" value={form.interests} options={interestOptions} onChange={(value) => updateField('interests', value)} testPrefix="interest" />
              <ChipGroup label="Companies and institutions on your radar" value={form.targetCompanies} options={companyOptions} onChange={(value) => updateField('targetCompanies', value)} testPrefix="company" />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <SectionHeading icon={Target} eyebrow="Career vector" title="Name the next milestone." description="A clear destination makes a focused training room more useful." />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Career goal" value={form.careerGoal} options={careerOptions} onChange={(value) => updateField('careerGoal', value)} testId="select-career-goal" />
              <SelectField label="Preferred job role" value={form.preferredJobRole} options={roleOptions} onChange={(value) => updateField('preferredJobRole', value)} testId="select-job-role" />
              <div className="sm:col-span-2">
                <label className="mb-2 block font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground" htmlFor="learning-goals">Learning goals</label>
                <textarea id="learning-goals" value={form.learningGoals} onChange={(event) => updateField('learningGoals', event.target.value)} placeholder="What should feel easier three months from now?" rows={4} data-testid="input-learning-goals" className="w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" />
              </div>
            </div>
          </section>

          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="font-semibold">Ready to update your room?</p>
              <p className="mt-1 text-sm text-muted-foreground">Changes flow to your dashboard and leaderboard context after saving.</p>
            </div>
            <SaveButton isPending={updateProfile.isPending} onClick={saveProfile} testId="button-save-profile" />
          </div>
        </div>

        <aside className="space-y-6">
          <section className="relative overflow-hidden rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-accent/20" />
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-accent/20" />
            <div className="relative">
              <div className="flex items-center gap-3">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" data-testid="img-profile-avatar" className="h-12 w-12 rounded-full object-cover ring-2 ring-accent/60" /> : <div data-testid="avatar-profile-fallback" className="grid h-12 w-12 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-foreground">{initials(displayName)}</div>}
                <div className="min-w-0">
                  <p data-testid="text-profile-name" className="truncate font-bold text-white">{displayName}</p>
                  <p data-testid="text-profile-username" className="truncate font-mono-ui text-[10px] uppercase tracking-wider text-sidebar-foreground/55">@{form.username || 'learner'}</p>
                </div>
              </div>
              <div className="mt-7 flex items-end justify-between">
                <div>
                  <p className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/50">Profile signal</p>
                  <p data-testid="text-profile-completion" className="mt-1 text-3xl font-extrabold text-white">{completion}%</p>
                </div>
                <p className="max-w-[120px] text-right text-xs leading-relaxed text-sidebar-foreground/60">{completionLabel}</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-sidebar-accent">
                <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${completion}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-sidebar-accent p-3"><p className="font-mono-ui text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Target</p><p className="mt-1 text-sm font-bold text-white">{target}</p></div>
                <div className="rounded-xl bg-sidebar-accent p-3"><p className="font-mono-ui text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Focus</p><p className="mt-1 text-sm font-bold text-white">{dailyGoal} min</p></div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <SectionHeading icon={Target} eyebrow="Training rhythm" title="Set the pace." description="These room-level preferences stay close to your practice flow." compact />
            <label className="mb-2 mt-6 block font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground" htmlFor="target-exam">Primary target</label>
            <SelectField label="" value={target} options={['UPSC CSE', 'SSC CGL', 'GATE Computer Science', 'State PSC']} onChange={setTarget} testId="select-target-exam" />
            <div className="mt-6 flex items-center gap-3">
              <input id="daily-goal" type="range" min="15" max="120" step="15" value={dailyGoal} onChange={(event) => setDailyGoal(event.target.value)} data-testid="input-daily-goal" className="w-full accent-[#e5b94b]" />
              <span data-testid="text-daily-goal" className="w-16 rounded-lg bg-muted px-2 py-2 text-center font-mono-ui text-xs">{dailyGoal} min</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Daily focused practice goal</p>
            <div className="mt-6 space-y-4 border-t border-border pt-5">
              <ToggleRow icon={Bell} title="Practice reminder" description="A quiet nudge at your preferred study hour." checked={notifications} onChange={() => setNotifications(!notifications)} testId="switch-practice-reminder" />
              <ToggleRow icon={Laptop} title="Compact question layout" description="Keep more context visible while solving." checked={compact} onChange={() => setCompact(!compact)} testId="switch-compact-layout" />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">{theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold">Training room theme</h3>
                <p data-testid="text-theme-status" className="mt-1 text-xs leading-relaxed text-muted-foreground">{theme === 'dark' ? 'Dark mode keeps the room low-noise for long sessions.' : 'Light mode keeps the room bright for daytime study.'}</p>
              </div>
            </div>
            <button type="button" onClick={toggleTheme} data-testid="button-toggle-theme" className="mt-5 flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-bold transition-colors hover:border-primary/50 hover:bg-muted">
              <span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
              {theme === 'dark' ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4 text-primary" />}
            </button>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function SettingsSkeleton() {
  return <div className="max-w-[1180px] animate-pulse"><div className="mb-8 h-28 max-w-2xl rounded-2xl bg-muted" /><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]"><div className="space-y-6"><div className="h-72 rounded-2xl bg-muted" /><div className="h-80 rounded-2xl bg-muted" /><div className="h-96 rounded-2xl bg-muted" /></div><div className="space-y-6"><div className="h-72 rounded-2xl bg-muted" /><div className="h-60 rounded-2xl bg-muted" /></div></div></div>;
}

function SaveButton({ isPending, onClick, testId }: { isPending: boolean; onClick: () => void; testId: string }) {
  return <button type="button" onClick={onClick} disabled={isPending} data-testid={testId} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-70"><Save className="h-4 w-4" /> {isPending ? 'Saving profile' : 'Save profile'}</button>;
}

function ProfileStatus({ feedback }: { feedback: 'saved' | 'error' | null }) {
  if (feedback === 'saved') return <div data-testid="status-profile-saved" className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Profile saved</div>;
  if (feedback === 'error') return <div data-testid="status-profile-error" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"><AlertCircle className="h-4 w-4" /> Save failed, try again</div>;
  return null;
}

function SectionHeading({ icon: Icon, eyebrow, title, description, compact = false }: { icon: typeof Target; eyebrow: string; title: string; description: string; compact?: boolean }) {
  return <div className={`flex items-start gap-3 ${compact ? '' : 'mb-7'}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><div><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">{eyebrow}</p><h2 className="mt-1 text-lg font-extrabold tracking-tight">{title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p></div></div>;
}

function Field({ label, value, onChange, placeholder, testId, prefix, icon: Icon, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; testId: string; prefix?: string; icon?: typeof Phone; inputMode?: 'numeric' }) {
  return <div><label className="mb-2 block font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">{label}</label><div className="relative">{prefix && <span className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground">{prefix}</span>}{Icon && <Icon className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-muted-foreground" />}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} data-testid={testId} className={`w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15 ${prefix ? 'pl-8' : Icon ? 'pl-11' : ''}`} /></div></div>;
}

function ReadOnlyField({ label, value, icon: Icon, testId }: { label: string; value: string; icon: typeof Mail; testId: string }) {
  return <div><label className="mb-2 block font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">{label}<span className="ml-2 text-[9px] normal-case tracking-normal text-muted-foreground/60">read only</span></label><div className="flex items-center gap-3 rounded-xl border border-input bg-muted/60 px-4 py-3 text-sm text-muted-foreground"><Icon className="h-4 w-4 shrink-0" /><span data-testid={testId} className="truncate">{value}</span></div></div>;
}

function SelectField({ label, value, options, onChange, testId }: { label: string; value: string; options: string[]; onChange: (value: string) => void; testId: string }) {
  return <div>{label && <label className="mb-2 block font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground">{label}</label>}<div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"><option value="">Choose one</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-muted-foreground" /></div></div>;
}

function ChipGroup({ label, value, options, onChange, testPrefix }: { label: string; value: string[]; options: string[]; onChange: (value: string[]) => void; testPrefix: string }) {
  const [custom, setCustom] = useState('');
  const available = useMemo(() => options.filter((option) => !value.includes(option)), [options, value]);
  const toggle = (option: string) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  const addCustom = () => {
    const clean = custom.trim();
    if (clean && !value.includes(clean)) onChange([...value, clean]);
    setCustom('');
  };
  return <div><p className="mb-3 text-sm font-bold">{label}</p><div className="flex flex-wrap gap-2">{value.map((item) => <button key={item} type="button" onClick={() => toggle(item)} data-testid={`chip-${testPrefix}-${item.toLowerCase().replaceAll(' ', '-')}`} className="rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90">{item}<span className="ml-2 opacity-70">×</span></button>)}{available.map((item) => <button key={item} type="button" onClick={() => toggle(item)} data-testid={`chip-${testPrefix}-${item.toLowerCase().replaceAll(' ', '-')}`} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">{item}</button>)}<div className="flex w-full max-w-[260px] items-center gap-2 pt-1"><input value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} placeholder="Add a custom signal" data-testid={`input-custom-${testPrefix}`} className="min-w-0 flex-1 border-b border-border bg-transparent px-1 py-2 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary" /><button type="button" onClick={addCustom} data-testid={`button-add-${testPrefix}`} className="rounded-lg border border-border px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary">Add</button></div></div></div>;
}

function ToggleRow({ icon: Icon, title, description, checked, onChange, testId }: { icon: typeof Bell; title: string; description: string; checked: boolean; onChange: () => void; testId: string }) {
  return <div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div></div><button type="button" role="switch" aria-checked={checked} onClick={onChange} data-testid={testId} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>;
}