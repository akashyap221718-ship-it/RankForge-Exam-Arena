import { DatabaseSync } from "node:sqlite";
import { db, eq, formatSqlRows, pool, codingProblemsTable, codingTestCasesTable } from "@workspace/db";
import problems from "./coding-problems";
import sqlProblems, { SQL_INPUT_FORMAT, sqlStarter } from "./coding-sql-problems";
import { PROGRAM_LANGUAGES, startersFor } from "./starter-templates";

const norm = (s: string) => s.replace(/\r\n/g, "\n").trimEnd();

type Row = typeof codingProblemsTable.$inferInsert;
type Test = { input: string; expectedOutput: string; isSample: boolean };
type Prepared = { values: Row; tests: Test[] };

function runReference(setup: string, query: string): string {
  const database = new DatabaseSync(":memory:");
  database.exec(setup);
  const statement = database.prepare(query);
  statement.setReturnArrays(true);
  return formatSqlRows(statement.all() as unknown as unknown[][]);
}

function prepareProgramProblems(): Prepared[] {
  return problems.map((p) => {
    // Expected outputs come from the reference solution; the written samples must agree with it.
    for (const s of p.samples) {
      if (norm(p.solve(s.input)) !== norm(s.output)) throw new Error(`${p.slug}: sample output does not match the reference solution`);
    }
    const inputs = [...p.samples.map((s) => ({ input: s.input, isSample: true })), ...p.hidden.map((input) => ({ input, isSample: false }))];
    const examples = p.samples.map((s, i) => `Example ${i + 1}\nInput:\n${s.input.trimEnd()}\nOutput:\n${s.output}`).join("\n\n");
    return {
      values: {
        slug: p.slug, title: p.title, statement: p.statement, difficulty: p.difficulty, topic: p.topic,
        supportedLanguages: [...PROGRAM_LANGUAGES], examples, constraints: p.constraints, expectedApproach: null,
        questionCode: p.code, inputFormat: p.inputFormat, outputFormat: p.outputFormat,
        starterCode: JSON.stringify(startersFor(p)), timeLimitMs: p.timeLimitMs ?? 2000, kind: "program", orderedResult: false,
      },
      tests: inputs.map((t) => ({ input: t.input, expectedOutput: p.solve(t.input), isSample: t.isSample })),
    };
  });
}

function prepareSqlProblems(): Prepared[] {
  return sqlProblems.map((p) => {
    const tests = p.datasets.map((setup, i) => ({ input: setup, expectedOutput: runReference(setup, p.reference), isSample: i === 0 }));
    const sample = tests[0]!;
    return {
      values: {
        slug: p.slug, title: p.title, statement: p.statement, difficulty: p.difficulty, topic: p.topic,
        supportedLanguages: ["sql"], examples: `Example 1\nTables:\n${sample.input}\nResult:\n${sample.expectedOutput}`,
        constraints: p.constraints, expectedApproach: null, questionCode: p.code, inputFormat: SQL_INPUT_FORMAT,
        outputFormat: p.outputFormat, starterCode: JSON.stringify({ sql: sqlStarter(p) }), timeLimitMs: 2000,
        kind: "sql", orderedResult: p.ordered,
      },
      tests,
    };
  });
}

async function main() {
  const all = [...prepareProgramProblems(), ...prepareSqlProblems()];
  let created = 0;
  let updated = 0;
  for (const { values, tests } of all) {
    await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: codingProblemsTable.id }).from(codingProblemsTable).where(eq(codingProblemsTable.slug, values.slug)).limit(1);
      let id: number;
      if (existing) {
        id = existing.id;
        await tx.update(codingProblemsTable).set(values).where(eq(codingProblemsTable.id, id));
        updated++;
      } else {
        const [row] = await tx.insert(codingProblemsTable).values(values).returning({ id: codingProblemsTable.id });
        id = row!.id;
        created++;
      }
      await tx.delete(codingTestCasesTable).where(eq(codingTestCasesTable.problemId, id));
      await tx.insert(codingTestCasesTable).values(tests.map((t, position) => ({ problemId: id, position, ...t })));
    });
  }
  console.log(`Coding problems: ${created} created, ${updated} updated (${all.length} total: ${problems.length} programming + ${sqlProblems.length} SQL)`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
