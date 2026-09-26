import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, learnerProfilesTable, learnerStatsTable, practiceAttemptsTable } from "@workspace/db";
import { asc, desc, eq } from "drizzle-orm";
import {
  GetDashboardResponse,
  GetQuestionParams,
  GetQuestionResponse,
  GetLeaderboardResponse,
  JoinContestParams,
  JoinContestResponse,
  ListContestsResponse,
  ListQuestionSetsQueryParams,
  ListQuestionSetsResponse,
  ListTracksResponse,
  SubmitAttemptBody,
  SubmitAttemptResponse,
} from "@workspace/api-zod";
import { ensureLearnerProfile, ensureLearnerStats, getAuthenticatedUserId } from "../lib/learner";

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

const tracks = [
  {
    id: 1,
    name: "General Aptitude",
    shortName: "APT",
    description: "Quant, reasoning, and exam-speed fundamentals",
    questionCount: 248,
    color: "amber",
  },
  {
    id: 2,
    name: "Core Engineering",
    shortName: "CORE",
    description: "Engineering concepts across high-weightage subjects",
    questionCount: 412,
    color: "cyan",
  },
  {
    id: 3,
    name: "GATE Computer Science",
    shortName: "GATE CS",
    description: "Algorithms, OS, DBMS, and systems thinking",
    questionCount: 356,
    color: "violet",
  },
  {
    id: 4,
    name: "SSC CGL",
    shortName: "SSC",
    description: "A focused path for Tier I and Tier II preparation",
    questionCount: 198,
    color: "rose",
  },
];

const questionSets = [
  {
    id: 1,
    title: "The 20-minute Quant Sprint",
    subtitle: "Percentages, ratios, and time-work",
    track: "General Aptitude",
    difficulty: "Medium",
    questions: 15,
    duration: 20,
    completion: 68,
    accent: "amber",
  },
  {
    id: 2,
    title: "Digital Logic Warm-up",
    subtitle: "K-maps, Boolean algebra, and circuits",
    track: "Core Engineering",
    difficulty: "Easy",
    questions: 12,
    duration: 18,
    completion: 42,
    accent: "cyan",
  },
  {
    id: 3,
    title: "Operating Systems: The Trap Set",
    subtitle: "Scheduling, deadlocks, and memory",
    track: "GATE Computer Science",
    difficulty: "Hard",
    questions: 10,
    duration: 25,
    completion: 12,
    accent: "violet",
  },
  {
    id: 4,
    title: "Reasoning: Signal vs Noise",
    subtitle: "Series, arrangements, and deductions",
    track: "SSC CGL",
    difficulty: "Medium",
    questions: 20,
    duration: 22,
    completion: 0,
    accent: "rose",
  },
];

const questions = [
  {
    id: 1,
    setId: 1,
    title: "The percentage checkpoint",
    prompt:
      "A machine's price is increased by 20% and then discounted by 20%. What is the net percentage change in the price?",
    options: ["No change", "4% decrease", "4% increase", "2% decrease"],
    answer: 1,
    explanation:
      "Take the original price as 100. After the increase it becomes 120; a 20% discount on 120 brings it to 96. That is a 4% decrease.",
    topic: "Percentages",
    difficulty: "Medium",
  },
  {
    id: 2,
    setId: 2,
    title: "Logic gate equivalence",
    prompt:
      "Which gate produces the same output as an AND gate followed by a NOT gate?",
    options: ["OR", "NAND", "NOR", "XOR"],
    answer: 1,
    explanation:
      "A NAND gate is, by definition, an AND operation followed by inversion.",
    topic: "Digital Logic",
    difficulty: "Easy",
  },
  {
    id: 3,
    setId: 3,
    title: "Shortest-job-first intuition",
    prompt:
      "In a non-preemptive scheduling system, which strategy minimizes average waiting time when all burst times are known?",
    options: [
      "First Come First Served",
      "Round Robin",
      "Shortest Job First",
      "Priority by arrival time",
    ],
    answer: 2,
    explanation:
      "Non-preemptive Shortest Job First schedules the smallest burst first and gives the minimum average waiting time when burst times are known.",
    topic: "Operating Systems",
    difficulty: "Hard",
  },
];

const contests = [
  {
    id: 1,
    title: "Sunday Core Clash",
    subtitle: "25 questions across core engineering",
    startsAt: "Sun, 27 Sep · 10:00 AM",
    duration: 45,
    participants: 1284,
    status: "Starts in 18h",
    accent: "cyan",
  },
  {
    id: 2,
    title: "GATE CS Night Shift",
    subtitle: "Algorithms, DBMS, and operating systems",
    startsAt: "Tue, 29 Sep · 9:30 PM",
    duration: 60,
    participants: 906,
    status: "Registration open",
    accent: "violet",
  },
  {
    id: 3,
    title: "Aptitude Blitz #12",
    subtitle: "A 15-minute speed round",
    startsAt: "Live now",
    duration: 15,
    participants: 432,
    status: "Live",
    accent: "amber",
  },
];

router.get("/dashboard", async (req, res, next) => {
  try {
    const profile = await ensureLearnerProfile(req);
    const stats = await ensureLearnerStats(profile.userId);
    const rankings = await db
      .select({ userId: learnerStatsTable.userId, rating: learnerStatsTable.rating })
      .from(learnerStatsTable)
      .orderBy(desc(learnerStatsTable.rating), asc(learnerStatsTable.updatedAt));
    const rank = Math.max(1, rankings.findIndex((entry) => entry.userId === profile.userId) + 1);
    const totalUsers = Math.max(1, rankings.length);
    const focus = profile.interests.length > 0
      ? profile.interests.slice(0, 3).map((name, index) => ({
          name,
          subtitle: "From your learning interests",
          progress: Math.min(100, stats.solved * 5 + (index * 7)),
          color: ["violet", "amber", "cyan"][index] ?? "violet",
        }))
      : [
          { name: "Complete your profile", subtitle: "Unlock better recommendations", progress: 0, color: "violet" },
          { name: "Start a practice set", subtitle: "Build your first signal", progress: 0, color: "amber" },
          { name: "Choose a career goal", subtitle: "Shape your training room", progress: 0, color: "cyan" },
        ];
    res.json(
      GetDashboardResponse.parse({
        user: {
          name: profile.fullName || "Learner",
          initials: initialsFor(profile.fullName || "Learner"),
          target: profile.careerGoal || profile.preferredJobRole || profile.branch || "Choose a target",
          streak: stats.streak,
          rank,
          percentile: Math.round((1 - (rank - 1) / totalUsers) * 1000) / 10,
        },
        stats: {
          solved: stats.solved,
          accuracy: stats.totalAttempts ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100) : 0,
          rating: stats.rating,
          hours: Math.round((stats.focusMinutes / 60) * 10) / 10,
          solvedDelta: 0,
          accuracyDelta: 0,
          ratingDelta: 0,
          hoursDelta: 0,
        },
        focus,
        recentActivity: [],
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/tracks", (_req, res) => {
  res.json(ListTracksResponse.parse(tracks));
});

router.get("/question-sets", (req, res) => {
  const parsed = ListQuestionSetsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const filtered = parsed.data.track
    ? questionSets.filter((set) => set.track.toLowerCase().includes(parsed.data.track!.toLowerCase()))
    : questionSets;
  res.json(ListQuestionSetsResponse.parse(filtered));
});

router.get("/questions/:id", (req, res) => {
  const parsed = GetQuestionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const question = questions.find((item) => item.id === parsed.data.id);
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.json(GetQuestionResponse.parse(question));
});

router.post("/attempts", async (req, res, next) => {
  const parsed = SubmitAttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const question = questions.find((item) => item.id === parsed.data.questionId);
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await ensureLearnerProfile(req);
    const correct = parsed.data.selectedOption === question.answer;
    const points = correct ? Math.max(40, 100 - Math.floor(parsed.data.secondsSpent / 8)) : 0;
    const newRating = await db.transaction(async (tx) => {
      await tx.insert(learnerStatsTable).values({ userId }).onConflictDoNothing();
      const [current] = await tx.select().from(learnerStatsTable).where(eq(learnerStatsTable.userId, userId)).limit(1);
      if (!current) throw new Error("Learner stats not found");
      const now = new Date();
      const sameDay = current.lastPracticeAt
        && current.lastPracticeAt.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
      const nextRating = Math.max(0, current.rating + (correct ? 8 : -3));
      await tx.insert(practiceAttemptsTable).values({
        userId,
        questionId: parsed.data.questionId,
        selectedOption: parsed.data.selectedOption,
        secondsSpent: parsed.data.secondsSpent,
        correct,
        points,
      });
      await tx
        .update(learnerStatsTable)
        .set({
          rating: nextRating,
          points: current.points + points,
          solved: current.solved + (correct ? 1 : 0),
          correctAttempts: current.correctAttempts + (correct ? 1 : 0),
          totalAttempts: current.totalAttempts + 1,
          focusMinutes: current.focusMinutes + Math.max(1, Math.ceil(parsed.data.secondsSpent / 60)),
          streak: sameDay ? current.streak : current.streak + 1,
          lastPracticeAt: now,
        })
        .where(eq(learnerStatsTable.userId, userId));
      return nextRating;
    });
    res.status(201).json(
      SubmitAttemptResponse.parse({
        correct,
        points,
        explanation: question.explanation,
        newRating,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/contests", (_req, res) => {
  res.json(ListContestsResponse.parse(contests));
});

router.post("/contests/:id/join", (req, res) => {
  const parsed = JoinContestParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const contest = contests.find((item) => item.id === parsed.data.id);
  if (!contest) {
    res.status(404).json({ error: "Contest not found" });
    return;
  }
  contest.participants += 1;
  res.json(JoinContestResponse.parse(contest));
});

router.get("/leaderboard", async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const profile = await ensureLearnerProfile(req);
    await ensureLearnerStats(userId);
    const rows = await db
      .select({
        userId: learnerStatsTable.userId,
        name: learnerProfilesTable.fullName,
        branch: learnerProfilesTable.branch,
        careerGoal: learnerProfilesTable.careerGoal,
        preferredJobRole: learnerProfilesTable.preferredJobRole,
        rating: learnerStatsTable.rating,
        solved: learnerStatsTable.solved,
      })
      .from(learnerStatsTable)
      .innerJoin(learnerProfilesTable, eq(learnerProfilesTable.userId, learnerStatsTable.userId))
      .orderBy(desc(learnerStatsTable.rating), desc(learnerStatsTable.solved));
    const entries = rows.map((entry, index) => ({
      rank: index + 1,
      name: entry.name || "Learner",
      initials: initialsFor(entry.name || "Learner"),
      target: entry.careerGoal || entry.preferredJobRole || entry.branch || "Learner",
      rating: entry.rating,
      solved: entry.solved,
      isCurrentUser: entry.userId === profile.userId,
    }));
    const current = entries.find((entry) => entry.isCurrentUser);
    res.json(GetLeaderboardResponse.parse({
      userRank: current?.rank ?? 1,
      totalUsers: entries.length,
      entries,
    }));
  } catch (error) {
    next(error);
  }
});

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "L";
}

export default router;