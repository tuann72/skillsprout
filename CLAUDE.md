# SkillSprout

AI-powered skill tree generator. Users describe a skill, and Claude generates a structured lesson plan visualized as an interactive tree.

## Tech Stack

- **Framework**: Next.js (App Router), React 19, TypeScript
- **UI**: shadcn/ui + Tailwind CSS v4
- **Visualization**: @xyflow/react for skill tree rendering
- **LLM**: Anthropic Claude API (claude-sonnet-4-5) with forced tool use
- **Auth & DB**: Supabase (auth, Postgres, RLS)

## Architecture

### Core Flow
`HomeFlow.tsx` orchestrates the app state as a step machine: `saved-plans → form → level → loading → tree`. The tree step holds skills, layers, planId, lessonDbIds, and the raw LessonPlan.

### Key Files
- `types/lesson-plan.ts` — Core types: `Lesson`, `Layer`, `LessonPlan`, `Difficulty`
- `components/SkillTreeFlow.tsx` — Tree visualization, `convertLessonPlan()`, completion toggle, progress bar
- `components/HomeFlow.tsx` — Main flow orchestrator, modify handler, calendar context integration
- `components/AuthProvider.tsx` — Supabase auth context
- `components/CalendarContext.tsx` — Bridges lesson data from HomeFlow to CalendarSideBar
- `lib/lesson-plan-schema.ts` — Shared Anthropic tool schema for generate + modify endpoints
- `lib/schedule.ts` — Topological sort + sequential scheduling algorithm

### API Routes
- `POST /api/generate-lesson-plan` — Generate a new plan via Claude
- `POST /api/modify-lesson-plan` — Modify an existing plan via Claude (preserves completions)
- `GET /api/lesson-plans/[id]` — Load a saved plan
- `POST|DELETE /api/lesson-completions` — Toggle lesson completion

### Database (Supabase)
- `profiles` — auto-created on signup
- `lesson_plans` — stores plans with `raw_plan` jsonb
- `lessons` — normalized lessons, unique on (plan_id, lesson_number)
- `layers` — layer metadata per plan
- `lesson_completions` — per-user per-lesson completion tracking
- All tables have RLS policies scoped to `auth.uid()`

## Conventions

- Guest mode is preserved: unauthenticated users get ephemeral behavior (no DB persistence)
- Completion state is tracked separately from lesson content (user-specific, in `lesson_completions` table)
- Optimistic UI for completion toggles with DB revert on failure
- When modifying plans, lessons are matched by `lesson_number + topic` to preserve completion UUIDs
- Calendar scheduling uses topological sort with sequential scheduling (not parallel)
- The `CalendarContext` bridges layout-level sidebar and page-level HomeFlow via React Context

## Development

```bash
npm run dev     # Start dev server
npm run build   # Production build
npx tsc --noEmit  # Type check
```

Environment variables needed:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
