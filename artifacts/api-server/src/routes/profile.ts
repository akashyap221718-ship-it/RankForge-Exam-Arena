import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, learnerProfilesTable } from "@workspace/db";
import { UpdateProfileBody, UpdateProfileResponse } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { ensureLearnerProfile, getAuthenticatedUserId, toProfileResponse } from "../lib/learner";

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

router.get("/profile", async (req, res, next) => {
  try {
    const profile = await ensureLearnerProfile(req);
    res.json(UpdateProfileResponse.parse(toProfileResponse(req, profile)));
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = UpdateProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    await ensureLearnerProfile(req);
    const update = Object.fromEntries(
      Object.entries(parsed.data).map(([key, value]) => [key, value === "" ? null : value]),
    );
    const [profile] = await db
      .update(learnerProfilesTable)
      .set(update)
      .where(eq(learnerProfilesTable.userId, userId))
      .returning();
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(UpdateProfileResponse.parse(toProfileResponse(req, profile)));
  } catch (error) {
    next(error);
  }
});

export default router;