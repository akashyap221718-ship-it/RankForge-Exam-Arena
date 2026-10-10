import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, feedbackTable, jobsTable } from "@workspace/db";
import {
  CreateFeedbackBody,
  CreateFeedbackResponse,
  GetCodingProblemParams,
  GetCodingProblemResponse,
  ListCodingProblemsQueryParams,
  ListCodingProblemsResponse,
  ListCodingSubmissionsQueryParams,
  RunCodingSolutionBody,
  RunCodingSolutionResponse,
  ListEngineeringMaterialsQueryParams,
  ListEngineeringMaterialsResponse,
  ListInterviewQuestionsQueryParams,
  ListInterviewQuestionsResponse,
  ListInterviewRolesResponse,
  ListJobsQueryParams,
  ListJobsResponse,
  SubmitCodingSolutionBody,
  ListCodingSubmissionsResponse,
  SubmitCodingSolutionResponse,
} from "@workspace/api-zod";
import { and, eq, ilike, or } from "drizzle-orm";
import { getAuthenticatedUserId } from "../lib/learner";
import { CodingError, getProblem, listProblems, listSubmissions, runCode, submitCode } from "../lib/coding";
import { allowRun } from "../lib/judge";

const router: IRouter = Router();

router.use((req, res, next) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

const engineeringMaterials = [
  { id: 1, branch: "Computer Science & IT", subject: "Data Structures", title: "Choosing the right structure", materialType: "Notes", summary: "A practical guide to arrays, hash maps, stacks, queues, and when their trade-offs matter.", topics: ["Arrays", "Hashing", "Stacks", "Queues"] },
  { id: 2, branch: "Computer Science & IT", subject: "Operating Systems", title: "Scheduling and deadlocks", materialType: "Notes", summary: "Understand scheduling objectives, deadlock conditions, and the reasoning patterns that exams test.", topics: ["CPU Scheduling", "Deadlocks", "Memory"] },
  { id: 3, branch: "Electronics & Communication", subject: "Digital Electronics", title: "Boolean logic essentials", materialType: "Formula sheet", summary: "Core identities, gate equivalences, and a compact path from truth tables to circuits.", topics: ["Boolean Algebra", "Logic Gates", "K-Maps"] },
  { id: 4, branch: "Electrical Engineering", subject: "Circuit Theory", title: "Steady-state circuit analysis", materialType: "Worked examples", summary: "A worked-example set for nodal analysis, mesh analysis, and source transformations.", topics: ["KCL", "KVL", "Thevenin"] },
  { id: 5, branch: "Mechanical Engineering", subject: "Thermodynamics", title: "First-law checkpoints", materialType: "Notes", summary: "Build intuition for closed systems, control volumes, and energy balance questions.", topics: ["Energy Balance", "Properties", "Cycles"] },
  { id: 6, branch: "Civil Engineering", subject: "Strength of Materials", title: "Stress and strain map", materialType: "Formula sheet", summary: "A focused reference for axial loading, bending, shear, and common sign conventions.", topics: ["Stress", "Strain", "Bending"] },
  { id: 7, branch: "AI & Data Science", subject: "Statistics", title: "Statistics for data work", materialType: "Notes", summary: "Distributions, sampling, confidence, and the statistics vocabulary used in interviews.", topics: ["Distributions", "Sampling", "Inference"] },
];

const interviewQuestions = [
  { id: 1, role: "Software Developer", category: "Data Structures & Algorithms", prompt: "How would you find the first non-repeating character in a string, and what are the time and space costs?", difficulty: "Easy", answerGuide: "Describe a frequency map followed by an ordered scan. State why the two passes remain linear." },
  { id: 2, role: "Software Developer", category: "OOP", prompt: "Explain composition versus inheritance using a system you have built or studied.", difficulty: "Medium", answerGuide: "Compare reuse, coupling, substitutability, and how the choice affects testing and future change." },
  { id: 3, role: "Data Analyst", category: "SQL", prompt: "How would you identify customers whose second purchase occurred within 30 days of their first?", difficulty: "Medium", answerGuide: "Use window functions or a grouped first-purchase CTE, then join to the next purchase date and filter the interval." },
  { id: 4, role: "Data Analyst", category: "Statistics", prompt: "What is the difference between correlation and causation, and how would you investigate a surprising correlation?", difficulty: "Medium", answerGuide: "Discuss confounders, selection bias, experiment design, and how segmentation can reveal Simpson's paradox." },
  { id: 5, role: "Data Engineer", category: "ETL/ELT", prompt: "What makes a data pipeline idempotent, and why does that matter when a job retries?", difficulty: "Medium", answerGuide: "Explain deterministic keys, checkpoints, upserts, and how retries avoid duplicate downstream records." },
  { id: 6, role: "Data Engineer", category: "Distributed systems", prompt: "How would you reason about late-arriving events in a daily aggregate?", difficulty: "Hard", answerGuide: "Cover event time versus processing time, watermarks, backfills, and a correction strategy for closed windows." },
];

router.get("/jobs", async (req, res, next) => {
  try {
    const parsed = ListJobsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const filters = [eq(jobsTable.active, 1)];
    if (parsed.data.search) {
      filters.push(or(ilike(jobsTable.title, `%${parsed.data.search}%`), ilike(jobsTable.company, `%${parsed.data.search}%`))!);
    }
    if (parsed.data.workType) filters.push(eq(jobsTable.workType, parsed.data.workType));
    if (parsed.data.location) filters.push(ilike(jobsTable.location, `%${parsed.data.location}%`));
    const jobs = await db.select().from(jobsTable).where(and(...filters)).orderBy(jobsTable.updatedAt);
    res.json(ListJobsResponse.parse(jobs.map((job) => ({
      ...job,
      salary: job.salary ?? null,
      applicationDeadline: job.applicationDeadline ?? null,
      updatedAt: job.updatedAt.toISOString(),
    }))));
  } catch (error) {
    next(error);
  }
});

router.get("/engineering/materials", (req, res) => {
  const parsed = ListEngineeringMaterialsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const items = parsed.data.branch
    ? engineeringMaterials.filter((item) => item.branch.toLowerCase().includes(parsed.data.branch!.toLowerCase()))
    : engineeringMaterials;
  res.json(ListEngineeringMaterialsResponse.parse(items));
});

router.get("/interview/roles", (_req, res) => {
  const grouped = new Map<string, string[]>();
  for (const question of interviewQuestions) {
    grouped.set(question.role, [...(grouped.get(question.role) ?? []), question.category]);
  }
  res.json(ListInterviewRolesResponse.parse([...grouped.entries()].map(([role, categories]) => ({
    role,
    questionCount: interviewQuestions.filter((question) => question.role === role).length,
    categories: [...new Set(categories)],
  }))));
});

router.get("/interview/questions", (req, res) => {
  const parsed = ListInterviewQuestionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const items = parsed.data.role
    ? interviewQuestions.filter((question) => question.role.toLowerCase() === parsed.data.role!.toLowerCase())
    : interviewQuestions;
  res.json(ListInterviewQuestionsResponse.parse(items));
});

function requireUser(req: Parameters<typeof getAuthenticatedUserId>[0], res: import("express").Response): string | null {
  const userId = getAuthenticatedUserId(req);
  if (!userId) res.status(401).json({ error: "Unauthorized" });
  return userId;
}

function handleCodingError(error: unknown, res: import("express").Response, next: import("express").NextFunction) {
  if (error instanceof CodingError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  next(error);
}

router.get("/coding/problems", async (req, res, next) => {
  const parsed = ListCodingProblemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    res.json(ListCodingProblemsResponse.parse(await listProblems(userId, parsed.data)));
  } catch (error) {
    next(error);
  }
});

router.get("/coding/problems/:slug", async (req, res, next) => {
  const parsed = GetCodingProblemParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const problem = await getProblem(userId, parsed.data.slug);
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }
    res.json(GetCodingProblemResponse.parse(problem));
  } catch (error) {
    next(error);
  }
});

router.post("/coding/run", async (req, res, next) => {
  const parsed = RunCodingSolutionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    if (!allowRun(userId)) {
      res.status(429).json({ error: "Too many runs. Please wait a minute and try again." });
      return;
    }
    res.json(RunCodingSolutionResponse.parse(await runCode(parsed.data)));
  } catch (error) {
    handleCodingError(error, res, next);
  }
});

router.get("/coding/submissions", async (req, res, next) => {
  const parsed = ListCodingSubmissionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    res.json(ListCodingSubmissionsResponse.parse(await listSubmissions(userId, parsed.data.problemId)));
  } catch (error) {
    next(error);
  }
});

router.post("/coding/submissions", async (req, res, next) => {
  const parsed = SubmitCodingSolutionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    if (!allowRun(userId)) {
      res.status(429).json({ error: "Too many submissions. Please wait a minute and try again." });
      return;
    }
    res.status(201).json(SubmitCodingSolutionResponse.parse(await submitCode(userId, parsed.data)));
  } catch (error) {
    handleCodingError(error, res, next);
  }
});

router.post("/feedback", async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = CreateFeedbackBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [feedback] = await db.insert(feedbackTable).values({ userId, ...parsed.data }).returning();
    if (!feedback) {
      res.status(500).json({ error: "Unable to save feedback" });
      return;
    }
    res.status(201).json(CreateFeedbackResponse.parse({
      id: feedback.id,
      category: feedback.category,
      subject: feedback.subject,
      description: feedback.description,
      status: feedback.status,
      createdAt: feedback.createdAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

export default router;