import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, pool, questionBankTable } from "@workspace/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal RFC-4180 CSV parser (handles quoted fields, commas, newlines, "" escapes)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Split "A) x|B) ln|x| + C|C) ..." on '|' only when followed by "B)", "C)", "D)" etc.
const splitOptions = (s: string) => s.split(/\|(?=[A-H]\) )/).map((o) => o.trim());
const stripLabel = (o: string) => o.replace(/^[A-H]\)\s*/, "");

async function main() {
  const file = path.join(__dirname, "..", "question_bank.csv");
  const [header, ...data] = parseCsv(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  const rows = data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));

  const values = rows.map((r) => {
    const isMcq = r.type === "MCQ";
    const rawOpts = isMcq ? splitOptions(r.options) : [];
    const answerIndex = isMcq ? rawOpts.findIndex((o) => o === r.answer) : -1;
    if (isMcq && answerIndex < 0) throw new Error(`${r.id}: answer not found in options`);
    return {
      code: r.id,
      year: Number(r.year),
      subject: r.subject,
      type: r.type,
      question: r.question,
      options: rawOpts.map(stripLabel),
      answerIndex: isMcq ? answerIndex : null,
      sampleIo: isMcq ? null : r.options || null,
      difficulty: r.difficulty,
      tags: r.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
  });

  // code is UNIQUE -> re-running is safe, existing rows are skipped
  const inserted = await db.insert(questionBankTable).values(values).onConflictDoNothing().returning({ code: questionBankTable.code });
  console.log(`CSV rows: ${values.length} | newly inserted: ${inserted.length} | skipped (already present): ${values.length - inserted.length}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
