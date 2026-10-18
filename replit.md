# RankForge Exam Arena

RankForge is a competitive practice arena for government-job aspirants and engineering students, with exam tracks, timed practice, contests, explanations, streaks, and rank progression.

## Run & Operate

- `pnpm install --frozen-lockfile` — install the workspace dependencies
- Start `artifacts/rankforge-exam-arena: web` and `artifacts/api-server: API Server` in Replit Workflows for the local app and API (ports 21213 and 8080)
- `pnpm --filter @workspace/db run push` — apply the Drizzle schema to the development database only
- `pnpm --filter @workspace/scripts run seed-coding` — seed the programming and SQL practice problems in the development database
- `PORT=21213 BASE_PATH=/ pnpm --filter @workspace/rankforge-exam-arena run build` — build the web app outside its production workflow
- `pnpm --filter @workspace/api-server run build` — build the API server
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Replit provides `DATABASE_URL`; do not copy a database connection string into project files

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rankforge-exam-arena/src/` — responsive React/Vite application, routes, UI shell, and theme
- `artifacts/api-server/src/routes/exam-arena.ts` — seeded exam tracks, question sets, questions, contests, attempts, and leaderboard endpoints
- `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` — production Clerk proxy support
- `lib/api-spec/openapi.yaml` — source-of-truth API contract used to generate client hooks
- `lib/api-client-react/src/generated/` — generated React Query client and schemas
- `artifacts/rankforge-exam-arena/src/index.css` — shared color tokens, typography, and motion helpers

## Architecture decisions

- The product is organized around an exam-training loop: dashboard signal → focused set → scored attempt → visible rank feedback.
- Exam practice data is seeded by the API; coding problems and test cases are seeded into the development database with `seed-coding`.
- Frontend API calls use generated hooks from the OpenAPI contract rather than hand-written fetch calls.
- Clerk is the managed authentication provider; the browser uses same-origin session cookies and the API validates sessions with Clerk middleware.
- The visual system uses an indigo training-room foundation with brass rank signals, calibration-blue surfaces, and mono metadata to distinguish exam data from rewards.

## Product

- Overview dashboard with global rank, percentile, rating, solved count, accuracy, focus hours, streak, focus topics, activity feed, and recommended next practice.
- Practice room with exam tracks, searchable question sets, difficulty filters, completion progress, timed solving, correctness feedback, explanations, and rating changes.
- Contests page with live/upcoming states and join actions.
- Leaderboard page with global rank, targets, ratings, solved counts, search, and current learner highlighting.
- Settings page for target exam and daily focus preferences.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- The frontend and API are separate managed workflows; restart both after route or client changes.
- The shared API uses `/api` and the web app is served at `/`.
- Clerk development keys are expected in preview; production keys are provisioned automatically on publish.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
