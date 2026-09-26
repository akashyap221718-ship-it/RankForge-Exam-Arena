import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, codingSubmissionsTable, feedbackTable, jobsTable } from "@workspace/db";
import {
  CreateFeedbackBody,
  CreateFeedbackResponse,
  ListCodingProblemsQueryParams,
  ListCodingProblemsResponse,
  ListEngineeringMaterialsQueryParams,
  ListEngineeringMaterialsResponse,
  ListInterviewQuestionsQueryParams,
  ListInterviewQuestionsResponse,
  ListInterviewRolesResponse,
  ListJobsQueryParams,
  ListJobsResponse,
  SubmitCodingSolutionBody,
  SubmitCodingSolutionResponse,
} from "@workspace/api-zod";
import { and, eq, ilike, or } from "drizzle-orm";
import { getAuthenticatedUserId } from "../lib/learner";

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

const codingProblems = [
  { id: 1, slug: "balanced-brackets", title: "Balanced Brackets", statement: "Given a string containing brackets, determine whether every opening bracket closes in the correct order.", difficulty: "Easy", topic: "Stack", supportedLanguages: ["C", "C++", "Python", "Java", "JavaScript"], examples: "Input: {[()]} → Output: true", constraints: "1 ≤ length ≤ 100000; characters are brackets or lowercase letters.", expectedApproach: "Scan once with a stack and match every closing bracket against the latest opening bracket." },
  { id: 2, slug: "longest-unique-window", title: "Longest Unique Window", statement: "Return the length of the longest contiguous substring with no repeated characters.", difficulty: "Medium", topic: "Sliding Window", supportedLanguages: ["C++", "Python", "Java", "JavaScript"], examples: "Input: abca → Output: 3", constraints: "The input contains printable ASCII characters and has length at most 100000.", expectedApproach: "Use a moving left boundary and a map of the most recent index for each character." },
  { id: 3, slug: "minimum-grid-cost", title: "Minimum Grid Cost", statement: "Move only right or down through a non-negative cost grid and return the minimum cost from the top-left to the bottom-right.", difficulty: "Hard", topic: "Dynamic Programming", supportedLanguages: ["C++", "Python", "Java"], examples: "Input: [[1,3],[2,1]] → Output: 4", constraints: "1 ≤ rows, columns ≤ 500; costs fit in a signed 32-bit integer.", expectedApproach: "Build a row-optimized dynamic-programming table and retain only the previous row's state." },
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

router.get("/coding/problems", (req, res) => {
  const parsed = ListCodingProblemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const items = codingProblems.filter((problem) =>
    (!parsed.data.difficulty || problem.difficulty.toLowerCase() === parsed.data.difficulty!.toLowerCase())
    && (!parsed.data.topic || problem.topic.toLowerCase().includes(parsed.data.topic!.toLowerCase())),
  );
  res.json(ListCodingProblemsResponse.parse(items));
});

router.post("/coding/submissions", async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = SubmitCodingSolutionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!codingProblems.some((problem) => problem.id === parsed.data.problemId)) {
      res.status(404).json({ error: "Coding problem not found" });
      return;
    }
    await db.insert(codingSubmissionsTable).values({ userId, ...parsed.data });
    res.status(201).json(SubmitCodingSolutionResponse.parse({
      accepted: true,
      status: "Queued for secure evaluation",
      message: "Your submission was stored. Code execution is intentionally isolated from the application server.",
    }));
  } catch (error) {
    next(error);
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