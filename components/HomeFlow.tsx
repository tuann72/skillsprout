"use client";

import { useCallback, useEffect, useState } from "react";
import { LandingForm, type LandingFormData } from "./LandingForm";
import { LevelSelect, type SkillLevel } from "./LevelSelect";
import SkillTreeFlow from "./SkillTreeFlow";
import { convertLessonPlan, type Skill } from "./SkillTreeFlow";
import { SavedPlans } from "./SavedPlans";
import { useAuth } from "./AuthProvider";
import { AIPanelArrow } from "@/components/custom/AI-panel-arrow";
import { NewDraftButton } from "@/components/custom/NewDraftButton";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LessonPlan, Layer } from "@/types/lesson-plan";

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
  | { kind: "tree"; skills: Skill[]; layers: Layer[]; planId: string | null; lessonDbIds: Record<number, string> }
  | { kind: "error"; message: string; formData: LandingFormData; level: SkillLevel }
  | { kind: "saved-plans" };

export default function HomeFlow() {
  const [step, setStep] = useState<Step>({ kind: "saved-plans" });
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

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
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setStep({ kind: "error", message, formData, level });
      }
    },
    []
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
      });
    } catch {
      setStep({ kind: "saved-plans" });
    }
  }, []);

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: "#dde5d4" }}>
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
      <div className="fixed top-16 right-4 z-20">
        <NewDraftButton onClick={() => setStep({ kind: "saved-plans" })} />
      </div>
      <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
        <AIPanelArrow />
      </div>
      <div className="absolute inset-0 z-0" style={{ backgroundColor: "#dde5d4" }}>
        <SkillTreeFlow
          skills={step.skills}
          layers={step.layers}
          planId={step.planId}
          lessonDbIds={step.lessonDbIds}
        />
      </div>
    </div>
  );
}
