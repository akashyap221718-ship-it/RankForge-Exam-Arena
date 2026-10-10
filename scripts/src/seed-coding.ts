import { db, eq, pool, codingProblemsTable, codingTestCasesTable } from "@workspace/db";
import problems, { starterCodeFor } from "./coding-problems";

const norm = (s: string) => s.replace(/\r\n/g, "\n").trimEnd();

async function main() {
  let created = 0;
  let updated = 0;
  for (const p of problems) {
    // Expected outputs come from the reference solution; the written samples must agree with it.
    for (const s of p.samples) {
      if (norm(p.solve(s.input)) !== norm(s.output)) throw new Error(`${p.slug}: sample output does not match the reference solution`);
    }
    const inputs = [...p.samples.map((s) => ({ input: s.input, isSample: true })), ...p.hidden.map((input) => ({ input, isSample: false }))];
    const examples = p.samples.map((s, i) => `Example ${i + 1}\nInput:\n${s.input.trimEnd()}\nOutput:\n${s.output}`).join("\n\n");

    await db.transaction(async (tx) => {
      const values = {
        slug: p.slug,
        title: p.title,
        statement: p.statement,
        difficulty: p.difficulty,
        topic: p.topic,
        supportedLanguages: ["javascript"],
        examples,
        constraints: p.constraints,
        expectedApproach: null,
        questionCode: p.code,
        inputFormat: p.inputFormat,
        outputFormat: p.outputFormat,
        starterCode: JSON.stringify({ javascript: starterCodeFor(p) }),
        timeLimitMs: p.timeLimitMs ?? 2000,
      };
      const [existing] = await tx.select({ id: codingProblemsTable.id }).from(codingProblemsTable).where(eq(codingProblemsTable.slug, p.slug)).limit(1);
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
      await tx.insert(codingTestCasesTable).values(
        inputs.map((t, position) => ({ problemId: id, position, input: t.input, expectedOutput: p.solve(t.input), isSample: t.isSample })),
      );
    });
  }
  console.log(`Coding problems: ${created} created, ${updated} updated (${problems.length} total)`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
