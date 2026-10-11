/**
 * Shared by the seed script (which computes expected results) and the API server (which judges
 * learner queries), so both sides format SQL results in exactly the same way.
 */

export function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Math.round(value * 1e6) / 1e6);
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return `x'${Buffer.from(value).toString("hex")}'`;
  return String(value);
}

/** One line per row, values joined by "|". NULL prints as NULL. */
export function formatSqlRows(rows: unknown[][]): string {
  return rows.map((row) => row.map(formatSqlValue).join("|")).join("\n");
}

const BLOCKED = /\b(attach|detach|pragma|insert|update|delete|drop|create|alter|load_extension)\b|\breplace\s+into\b/i;

/**
 * Learner SQL must be a single read-only query. SQLite's ATTACH can create files outside the
 * sandbox even under Node's permission model, so we never let anything except SELECT / WITH run.
 * Returns an error message, or null when the query is acceptable.
 */
export function validateUserSql(query: string): string | null {
  const stripped = query
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
    .replace(/`[^`]*`/g, "``")
    .trim();
  if (stripped === "") return "Write a query first.";
  if (!/^(select|with)\b/i.test(stripped)) return "Only SELECT queries are allowed (a query may start with WITH).";
  if (/;\s*\S/.test(stripped)) return "Only one statement is allowed.";
  const bad = stripped.match(BLOCKED);
  if (bad) return `The keyword ${bad[0].trim().toUpperCase()} is not allowed. Use a read-only SELECT query.`;
  return null;
}
