export function VerdictBadge({ verdict, className = '' }: { verdict: string; className?: string }) {
  const tone =
    verdict === 'Accepted' || verdict === 'Finished'
      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
      : verdict === 'Time Limit Exceeded'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : 'bg-red-500/12 text-red-700 dark:text-red-400';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tone} ${className}`} data-testid={`badge-verdict-${verdict}`}>{verdict}</span>;
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const tone =
    difficulty === 'Easy'
      ? 'text-emerald-700 dark:text-emerald-400'
      : difficulty === 'Medium'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400';
  return <span className={`text-xs font-bold ${tone}`}>{difficulty}</span>;
}

/** Pulls the server's { error } message out of a failed API call. */
export function errorText(error: unknown): string {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  if (data && typeof data.error === 'string') return data.error;
  return 'Something went wrong. Please try again.';
}
