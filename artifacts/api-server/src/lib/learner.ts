import { getAuth } from "@clerk/express";
import { db, learnerProfilesTable, learnerStatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request } from "express";

type Claims = Record<string, unknown>;

export function getAuthenticatedUserId(req: Request): string | null {
  const auth = getAuth(req);
  if (typeof auth?.userId === "string") return auth.userId;
  const claims = (auth as { sessionClaims?: unknown }).sessionClaims as Claims | undefined;
  return typeof claims?.userId === "string" ? claims.userId : null;
}

function getClaims(req: Request): Claims {
  const auth = getAuth(req);
  return ((auth as { sessionClaims?: unknown }).sessionClaims ?? {}) as Claims;
}

function claimString(claims: Claims, key: string): string {
  const value = claims[key];
  return typeof value === "string" ? value : "";
}

function defaultFullName(claims: Claims): string {
  const name = claimString(claims, "name");
  if (name) return name;
  return [claimString(claims, "firstName"), claimString(claims, "lastName")].filter(Boolean).join(" ");
}

export async function ensureLearnerProfile(req: Request) {
  const userId = getAuthenticatedUserId(req);
  if (!userId) throw new Error("Authenticated user is required");

  const claims = getClaims(req);
  const existing = await db.select().from(learnerProfilesTable).where(eq(learnerProfilesTable.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  await db
    .insert(learnerProfilesTable)
    .values({
      userId,
      fullName: defaultFullName(claims),
      username: claimString(claims, "username"),
    })
    .onConflictDoNothing();

  const [profile] = await db.select().from(learnerProfilesTable).where(eq(learnerProfilesTable.userId, userId)).limit(1);
  if (!profile) throw new Error("Unable to create learner profile");
  return profile;
}

export async function ensureLearnerStats(userId: string) {
  await db.insert(learnerStatsTable).values({ userId }).onConflictDoNothing();
  const [stats] = await db.select().from(learnerStatsTable).where(eq(learnerStatsTable.userId, userId)).limit(1);
  if (!stats) throw new Error("Unable to create learner stats");
  return stats;
}

export function profileCompletion(profile: typeof learnerProfilesTable.$inferSelect): number {
  const checks = [
    Boolean(profile.fullName),
    Boolean(profile.username),
    Boolean(profile.phoneNumber),
    Boolean(profile.college),
    Boolean(profile.course),
    Boolean(profile.branch),
    Boolean(profile.year),
    Boolean(profile.graduationYear),
    profile.skills.length > 0,
    profile.programmingLanguages.length > 0,
    profile.interests.length > 0,
    Boolean(profile.careerGoal),
    Boolean(profile.preferredJobRole),
    Boolean(profile.learningGoals),
    Boolean(profile.skillLevel),
    profile.targetCompanies.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function toProfileResponse(
  req: Request,
  profile: typeof learnerProfilesTable.$inferSelect,
) {
  const claims = getClaims(req);
  return {
    fullName: profile.fullName,
    username: profile.username,
    email: claimString(claims, "email"),
    avatarUrl: claimString(claims, "imageUrl") || null,
    phoneNumber: profile.phoneNumber,
    college: profile.college,
    course: profile.course,
    branch: profile.branch,
    year: profile.year,
    graduationYear: profile.graduationYear,
    skills: profile.skills,
    programmingLanguages: profile.programmingLanguages,
    interests: profile.interests,
    careerGoal: profile.careerGoal,
    preferredJobRole: profile.preferredJobRole,
    learningGoals: profile.learningGoals,
    skillLevel: profile.skillLevel,
    targetCompanies: profile.targetCompanies,
    profileCompletion: profileCompletion(profile),
  };
}