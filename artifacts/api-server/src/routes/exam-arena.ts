import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

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

const leaderboard = [
  { rank: 1, name: "Riya Mehta", initials: "RM", target: "GATE CSE", rating: 2184, solved: 486, isCurrentUser: false },
  { rank: 2, name: "Arjun Nair", initials: "AN", target: "UPSC + ESE", rating: 2148, solved: 452, isCurrentUser: false },
  { rank: 3, name: "Kabir Shah", initials: "KS", target: "GATE CSE", rating: 2096, solved: 428, isCurrentUser: false },
  { rank: 4, name: "Aarav Sharma", initials: "AS", target: "GATE CSE · You", rating: 1842, solved: 214, isCurrentUser: true },
  { rank: 5, name: "Nandini Rao", initials: "NR", target: "SSC CGL", rating: 1821, solved: 239, isCurrentUser: false },
  { rank: 6, name: "Dev Patel", initials: "DP", target: "ESE Mechanical", rating: 1798, solved: 196, isCurrentUser: false },
];

router.get("/dashboard", (_req, res) => {
  res.json(
    GetDashboardResponse.parse({
      user: {
        name: "Aarav Sharma",
        initials: "AS",
        target: "GATE CSE 2027",
        streak: 12,
        rank: 124,
        percentile: 98.4,
      },
      stats: {
        solved: 214,
        accuracy: 78,
        rating: 1842,
        hours: 34.5,
        solvedDelta: 18,
        accuracyDelta: 4,
        ratingDelta: 126,
        hoursDelta: 6.25,
      },
      focus: [
        { name: "Operating Systems", subtitle: "Your next rank unlock", progress: 72, color: "violet" },
        { name: "General Aptitude", subtitle: "Strong momentum", progress: 84, color: "amber" },
        { name: "Digital Logic", subtitle: "Needs a little attention", progress: 46, color: "cyan" },
      ],
      recentActivity: [
        { title: "Finished Digital Logic Warm-up", meta: "12 questions · 4 hours ago", points: 84, kind: "practice" },
        { title: "New personal best in Aptitude Blitz", meta: "Top 9% · Yesterday", points: 126, kind: "contest" },
        { title: "Unlocked the Consistency badge", meta: "12 day streak · Yesterday", points: 50, kind: "badge" },
        { title: "Reviewed 8 missed questions", meta: "Operating Systems · 2 days ago", points: 32, kind: "review" },
      ],
    }),
  );
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

router.post("/attempts", (req, res) => {
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
  const correct = parsed.data.selectedOption === question.answer;
  const points = correct ? Math.max(40, 100 - Math.floor(parsed.data.secondsSpent / 8)) : 0;
  res.status(201).json(
    SubmitAttemptResponse.parse({
      correct,
      points,
      explanation: question.explanation,
      newRating: 1842 + (correct ? 8 : -3),
    }),
  );
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

router.get("/leaderboard", (_req, res) => {
  res.json(
    GetLeaderboardResponse.parse({
      userRank: 124,
      totalUsers: 18420,
      entries: leaderboard,
    }),
  );
});

export default router;