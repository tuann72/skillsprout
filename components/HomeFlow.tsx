"use client";

import { useCallback, useEffect, useState } from "react";
import { LandingForm, type LandingFormData } from "./LandingForm";
import { LevelSelect, type SkillLevel } from "./LevelSelect";
import SkillTreeFlow from "./SkillTreeFlow";
import { convertLessonPlan, type Skill } from "./SkillTreeFlow";
import { SavedPlans } from "./SavedPlans";
import { useAuth } from "./AuthProvider";
import { AIPanelArrow } from "@/components/custom/AI-panel-arrow";
import { HomeButton } from "@/components/custom/NewDraftButton";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { LessonPlan, Layer } from "@/types/lesson-plan";
import { useCalendar } from "@/components/CalendarContext";

// ---- Map form values → API body ----

const LEVEL_TO_API: Record<SkillLevel, string> = {
  "brand-new": "beginner",
  beginner: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

const COMMITMENT_TO_MINUTES: Record<string, string> = {
  "15-min": "15",
  "30-min": "30",
  "1-hour": "60",
  "2-hours": "120",
};

const DURATION_LABELS: Record<string, string> = {
  "1-week": "1 week",
  "2-weeks": "2 weeks",
  "1-month": "1 month",
  "3-months": "3 months",
  "6-months": "6 months",
};

// ---- Step state ----

type Step =
  | { kind: "form" }
  | { kind: "level"; formData: LandingFormData }
  | { kind: "loading"; formData: LandingFormData; level: SkillLevel }
  | { kind: "tree"; skills: Skill[]; layers: Layer[]; planId: string | null; lessonDbIds: Record<number, string>; plan: LessonPlan }
  | { kind: "error"; message: string; formData: LandingFormData; level: SkillLevel }
  | { kind: "saved-plans" };

export default function HomeFlow() {
  const [step, setStep] = useState<Step>({ kind: "saved-plans" });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { setLessons, setDailyCommitmentMinutes } = useCalendar();
  const { setOpen, setOpenMobile } = useSidebar();

  // Collapse sidebar when navigating to the homepage
  useEffect(() => {
    if (step.kind === "saved-plans") {
      setOpen(false);
      setOpenMobile(false);
    }
  }, [step.kind, setOpen, setOpenMobile]);

  const generatePlan = useCallback(
    async (formData: LandingFormData, level: SkillLevel) => {
      setStep({ kind: "loading", formData, level });

      try {
        const res = await fetch("/api/generate-lesson-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skill: formData.skillName,
            currentLevel: LEVEL_TO_API[level],
            goalLevel: "expert",
            duration: DURATION_LABELS[formData.duration] ?? formData.duration,
            dailyCommitment:
              COMMITMENT_TO_MINUTES[formData.commitment] ?? formData.commitment,
            lessonCount: formData.lessonCount || "6-10",
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }

        const data = await res.json();
        const plan: LessonPlan = data;
        const { skills, layers } = convertLessonPlan(plan);

        // Hydrate completion state if returned from DB
        if (data.completions) {
          for (const skill of skills) {
            if (skill.lessonNumber != null) {
              skill.completed = data.completions[skill.lessonNumber] ?? false;
            }
          }
        }

        setStep({
          kind: "tree",
          skills,
          layers,
          planId: data.lesson_plan_id ?? null,
          lessonDbIds: data.lesson_db_ids ?? {},
          plan,
        });
        setLessons(plan.lessons);
        const mins = parseInt(COMMITMENT_TO_MINUTES[formData.commitment] ?? formData.commitment, 10);
        if (!isNaN(mins)) setDailyCommitmentMinutes(mins);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setStep({ kind: "error", message, formData, level });
      }
    },
    [setLessons, setDailyCommitmentMinutes]
  );

  const loadSavedPlan = useCallback(async (planId: string) => {
    setStep({ kind: "loading", formData: { skillName: "", lessonCount: "", duration: "", commitment: "" }, level: "brand-new" });

    try {
      const res = await fetch(`/api/lesson-plans/${planId}`);
      if (!res.ok) throw new Error("Failed to load plan");

      const data = await res.json();
      const plan: LessonPlan = data;
      const { skills, layers } = convertLessonPlan(plan);

      // Hydrate completion state
      if (data.completions) {
        for (const skill of skills) {
          if (skill.lessonNumber != null) {
            skill.completed = data.completions[skill.lessonNumber] ?? false;
          }
        }
      }

      setStep({
        kind: "tree",
        skills,
        layers,
        planId: data.lesson_plan_id,
        lessonDbIds: data.lesson_db_ids ?? {},
        plan,
      });
      setLessons(plan.lessons);
      if (data.daily_commitment) {
        setDailyCommitmentMinutes(parseInt(data.daily_commitment, 10) || 30);
      }
    } catch {
      setStep({ kind: "saved-plans" });
    }
  }, [setLessons, setDailyCommitmentMinutes]);

  const handleModifyPlan = useCallback(
    async (modificationRequest: string) => {
      console.log("[HomeFlow] handleModifyPlan called, step.kind:", step.kind);
      if (step.kind !== "tree") {
        console.log("[HomeFlow] step is not 'tree', returning early");
        return;
      }

      console.log("[HomeFlow] sending modify request:", modificationRequest);
      console.log("[HomeFlow] current plan title:", step.plan.title, "planId:", step.planId);
      console.log("[HomeFlow] current plan lessons:", step.plan.lessons.map(l => `${l.lesson_number}: ${l.topic}`));

      const res = await fetch("/api/modify-lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPlan: step.plan,
          modificationRequest,
          planId: step.planId,
        }),
      });

      console.log("[HomeFlow] API response status:", res.status);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[HomeFlow] API error body:", body);
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      console.log("[HomeFlow] API response data keys:", Object.keys(data));
      console.log("[HomeFlow] modified plan title:", data.title);
      console.log("[HomeFlow] modified plan lessons:", data.lessons?.map((l: { lesson_number: number; topic: string }) => `${l.lesson_number}: ${l.topic}`));

      const modifiedPlan: LessonPlan = data;
      const { skills, layers } = convertLessonPlan(modifiedPlan);
      console.log("[HomeFlow] converted skills count:", skills.length, "layers count:", layers.length);

      // Hydrate completion state if returned
      if (data.completions) {
        console.log("[HomeFlow] hydrating completions:", data.completions);
        for (const skill of skills) {
          if (skill.lessonNumber != null) {
            skill.completed = data.completions[skill.lessonNumber] ?? false;
          }
        }
      } else {
        console.log("[HomeFlow] no completions in response");
      }

      console.log("[HomeFlow] calling setStep with new tree data");
      setStep({
        kind: "tree",
        skills,
        layers,
        planId: data.lesson_plan_id ?? step.planId,
        lessonDbIds: data.lesson_db_ids ?? {},
        plan: modifiedPlan,
      });
      setLessons(modifiedPlan.lessons);
      console.log("[HomeFlow] modify complete, new step set");
    },
    [step, setLessons]
  );

  const handleNodeCreated = useCallback(
    (lesson: {
      lessonNumber: number;
      lessonDbId: string;
      topic: string;
      description: string;
      difficulty: string;
      durationMinutes: number;
      resources: string[];
      layer: number;
      connections: number[];
    }) => {
      if (step.kind !== "tree") return;
      // Update lessonDbIds with the new lesson
      setStep((prev) => {
        if (prev.kind !== "tree") return prev;
        return {
          ...prev,
          lessonDbIds: {
            ...prev.lessonDbIds,
            [lesson.lessonNumber]: lesson.lessonDbId,
          },
        };
      });
    },
    [step.kind]
  );

  // ---- Auth gate: redirect to login if not signed in ----
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  if (!authLoading && !user) {
    return null;
  }

  // ---- Form ----
  if (step.kind === "form") {
    return (
      <LandingForm
        onSubmit={(data) => setStep({ kind: "level", formData: data })}
      />
    );
  }

  // ---- Saved Plans ----
  if (step.kind === "saved-plans") {
    return (
      <SavedPlans
        onSelect={loadSavedPlan}
        onGenerateNew={() => setStep({ kind: "form" })}
      />
    );
  }

  // ---- Level select ----
  if (step.kind === "level") {
    return (
      <LevelSelect
        skillName={step.formData.skillName}
        onSelect={(level) => generatePlan(step.formData, level)}
        onBack={() => setStep({ kind: "saved-plans" })}
      />
    );
  }

  // ---- Loading ----
  if (step.kind === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: "#e8f5ff" }}>
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium text-zinc-700">
          Building your skill tree&hellip;
        </p>
        <p className="text-sm text-muted-foreground">
          This can take a few seconds.
        </p>
      </div>
    );
  }

  // ---- Error ----
  if (step.kind === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-4">
        <p className="text-lg font-semibold text-destructive">
          Failed to generate lesson plan
        </p>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {step.message}
        </p>
        <div className="flex gap-3">
          <button
            className="text-sm font-medium text-primary underline underline-offset-2"
            onClick={() => generatePlan(step.formData, step.level)}
          >
            Retry
          </button>
          <button
            className="text-sm font-medium text-muted-foreground underline underline-offset-2"
            onClick={() => setStep({ kind: "saved-plans" })}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  // ---- Tree ----
  return (
    <div className="relative h-screen w-screen">
      <div className="absolute top-4 left-4 z-10">
        <SidebarTrigger className="cursor-pointer bg-white" />
      </div>
      <div className="fixed top-16 right-4 z-20">
        <HomeButton onClick={() => { setLessons([]); setStep({ kind: "saved-plans" }); }} />
      </div>
      <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
        <AIPanelArrow onModify={handleModifyPlan} />
      </div>
      <div className="fixed bottom-4 right-4 z-20">
        <Button
          size="icon"
          variant="outline"
          className="h-10 w-10 rounded-full bg-white shadow-md cursor-pointer"
          onClick={() => setCreateDialogOpen(true)}
          title="Add node"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <div className="absolute inset-0 z-0" style={{ backgroundColor: "#e8f5ff" }}>
        <SkillTreeFlow
          skills={step.skills}
          layers={step.layers}
          planId={step.planId}
          lessonDbIds={step.lessonDbIds}
          createDialogOpen={createDialogOpen}
          onCreateDialogChange={setCreateDialogOpen}
          onNodeCreated={handleNodeCreated}
        />
      </div>
    </div>
  );
}
