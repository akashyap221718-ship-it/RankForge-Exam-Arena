import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, learnerProfilesTable, learnerStatsTable, practiceAttemptsTable, questionBankTable } from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
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

// ---- Questions now come from the `question_bank` table (MCQ rows only) ----

const TRACK_META = [
  { id: 1, name: "General Aptitude", shortName: "APT", description: "Quant, reasoning, and exam-speed fundamentals", color: "amber" },
  { id: 2, name: "Core Engineering", shortName: "CORE", description: "Engineering concepts across high-weightage subjects", color: "cyan" },
  { id: 3, name: "GATE Computer Science", shortName: "GATE CS", description: "Algorithms, OS, DBMS, and systems thinking", color: "violet" },
  { id: 4, name: "SSC CGL", shortName: "SSC", description: "A focused path for Tier I and Tier II preparation", color: "rose" },
];

// Which track each subject in the CSV belongs to. Unlisted subjects default to Core Engineering.
const TRACK_BY_SUBJECT: Record<string, string> = {
  "Programming in C": "GATE Computer Science",
  "Python & DSA": "GATE Computer Science",
  "Data & Computer Engineering": "GATE Computer Science",
};
const trackFor = (subject: string) => TRACK_BY_SUBJECT[subject] ?? "Core Engineering";
const colorFor = (track: string) => TRACK_META.find((t) => t.name === track)?.color ?? "cyan";

type BankRow = typeof questionBankTable.$inferSelect;

async function loadMcqRows(): Promise<BankRow[]> {
  return db.select().from(questionBankTable).where(eq(questionBankTable.type, "MCQ")).orderBy(asc(questionBankTable.id));
}

const titleCase = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// setId = id of the first question of that subject, so "Enter set" opens the first question
// and "Next question" (id + 1) walks through the subject.
function toQuestion(row: BankRow, setId: number) {
  const answer = row.answerIndex ?? 0;
  const letter = String.fromCharCode(65 + answer);
  return {
    id: row.id,
    setId,
    title: row.subject,
    prompt: row.question,
    options: row.options,
    answer,
    explanation: `The correct answer is ${letter}) ${row.options[answer] ?? ""}.`,
    topic: titleCase(row.tags[0] ?? row.subject),
    difficulty: row.difficulty,
  };
}

function groupBySubject(rows: BankRow[]) {
  const groups = new Map<string, BankRow[]>();
  for (const row of rows) {
    const list = groups.get(row.subject) ?? [];
    list.push(row);
    groups.set(row.subject, list);
  }
  return groups;
}

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

router.get("/tracks", async (_req, res, next) => {
  try {
    const rows = await loadMcqRows();
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(trackFor(row.subject), (counts.get(trackFor(row.subject)) ?? 0) + 1);
    const result = TRACK_META
      .filter((t) => (counts.get(t.name) ?? 0) > 0)
      .map((t) => ({ ...t, questionCount: counts.get(t.name) ?? 0 }));
    res.json(ListTracksResponse.parse(result));
  } catch (error) {
    next(error);
  }
});

router.get("/question-sets", async (req, res, next) => {
  const parsed = ListQuestionSetsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const rows = await loadMcqRows();
    const sets = [...groupBySubject(rows).entries()].map(([subject, list]) => {
      const track = trackFor(subject);
      const byDifficulty = new Map<string, number>();
      for (const r of list) byDifficulty.set(r.difficulty, (byDifficulty.get(r.difficulty) ?? 0) + 1);
      const difficulty = [...byDifficulty.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Easy";
      const topics = [...new Set(list.flatMap((r) => r.tags))].slice(0, 3).map(titleCase).join(", ");
      return {
        id: list[0]!.id,
        title: subject,
        subtitle: topics || `${list.length} questions`,
        track,
        difficulty,
        questions: list.length,
        duration: Math.ceil(list.length * 1.5),
        completion: 0,
        accent: colorFor(track),
      };
    });
    const filtered = parsed.data.track
      ? sets.filter((set) => set.track.toLowerCase().includes(parsed.data.track!.toLowerCase()))
      : sets;
    res.json(ListQuestionSetsResponse.parse(filtered));
  } catch (error) {
    next(error);
  }
});

router.get("/questions/:id", async (req, res, next) => {
  const parsed = GetQuestionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const rows = await loadMcqRows();
    const row = rows.find((item) => item.id === parsed.data.id);
    if (!row) {
      res.status(404).json({ error: "Question not found" });
      return;
    }
    const setId = rows.find((r) => r.subject === row.subject)!.id;
    res.json(GetQuestionResponse.parse(toQuestion(row, setId)));
  } catch (error) {
    next(error);
  }
});

router.post("/attempts", async (req, res, next) => {
  const parsed = SubmitAttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(questionBankTable)
    .where(and(eq(questionBankTable.id, parsed.data.questionId), eq(questionBankTable.type, "MCQ")))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  const question = toQuestion(row, row.id);
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