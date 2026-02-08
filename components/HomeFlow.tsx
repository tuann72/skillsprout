"use client";

import { useCallback, useState, useRef } from "react";
import { LandingForm, type LandingFormData } from "./LandingForm";
import { LevelSelect, type SkillLevel } from "./LevelSelect";
import { TreeSelect } from "./TreeSelect";
import SkillTreeFlow from "./SkillTreeFlow";
import { convertLessonPlan, type Skill } from "./SkillTreeFlow";
import { AIPanelArrow } from "@/components/custom/AI-panel-arrow";
import { NewDraftButton } from "@/components/custom/NewDraftButton";
import { Loader2 } from "lucide-react";
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
  | { kind: "treeSelect"; formData: LandingFormData; level: SkillLevel }
  | { kind: "loading"; formData: LandingFormData; level: SkillLevel; selectedTrees: string[] }
  | { kind: "tree"; skills: Skill[]; layers: Layer[]; selectedTrees: string[] }
  | { kind: "error"; message: string; formData: LandingFormData; level: SkillLevel; selectedTrees: string[] };

type PlanResult =
  | { status: "loading" }
  | { status: "success"; skills: Skill[]; layers: Layer[] }
  | { status: "error"; message: string };

export default function HomeFlow() {
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [planResult, setPlanResult] = useState<PlanResult>({ status: "loading" });
  const planPromiseRef = useRef<Promise<{ skills: Skill[]; layers: Layer[] } | null> | null>(null);

  const startGeneratingPlan = useCallback(
    async (formData: LandingFormData, level: SkillLevel) => {
      setPlanResult({ status: "loading" });

      const promise = (async () => {
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

          const plan: LessonPlan = await res.json();
          const { skills, layers } = convertLessonPlan(plan);
          setPlanResult({ status: "success", skills, layers });
          return { skills, layers };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Something went wrong.";
          setPlanResult({ status: "error", message });
          return null;
        }
      })();

      planPromiseRef.current = promise;
      return promise;
    },
    []
  );

  const handleTreeSelect = useCallback(
    async (selectedTrees: string[], formData: LandingFormData, level: SkillLevel) => {
      // Check current plan result
      if (planResult.status === "success") {
        setStep({ kind: "tree", skills: planResult.skills, layers: planResult.layers, selectedTrees });
      } else if (planResult.status === "error") {
        setStep({ kind: "error", message: planResult.message, formData, level, selectedTrees });
      } else {
        // Still loading - show loading screen and wait
        setStep({ kind: "loading", formData, level, selectedTrees });

        // Wait for the plan to complete
        const result = await planPromiseRef.current;
        if (result) {
          setStep({ kind: "tree", skills: result.skills, layers: result.layers, selectedTrees });
        } else {
          // Error occurred - planResult should have the error now
          const currentResult = planResult;
          if (currentResult.status === "error") {
            setStep({ kind: "error", message: currentResult.message, formData, level, selectedTrees });
          }
        }
      }
    },
    [planResult]
  );

  // ---- Form ----
  if (step.kind === "form") {
    return (
      <LandingForm
        onSubmit={(data) => setStep({ kind: "level", formData: data })}
      />
    );
  }

  // ---- Level select ----
  if (step.kind === "level") {
    return (
      <LevelSelect
        skillName={step.formData.skillName}
        onSelect={(level) => {
          // Start generating plan in background
          startGeneratingPlan(step.formData, level);
          // Move to tree select
          setStep({ kind: "treeSelect", formData: step.formData, level });
        }}
        onBack={() => setStep({ kind: "form" })}
      />
    );
  }

  // ---- Tree select (plan generating in background) ----
  if (step.kind === "treeSelect") {
    return (
      <TreeSelect
        onSelect={(selectedTrees) => handleTreeSelect(selectedTrees, step.formData, step.level)}
        onBack={() => setStep({ kind: "level", formData: step.formData })}
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
            onClick={() => {
              startGeneratingPlan(step.formData, step.level);
              setStep({ kind: "loading", formData: step.formData, level: step.level, selectedTrees: step.selectedTrees });
            }}
          >
            Retry
          </button>
          <button
            className="text-sm font-medium text-muted-foreground underline underline-offset-2"
            onClick={() => setStep({ kind: "form" })}
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
      <div className="fixed top-4 right-4 z-20">
        <NewDraftButton onClick={() => setStep({ kind: "form" })} />
      </div>
      <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
        <AIPanelArrow />
      </div>
      <div className="absolute inset-0 z-0" style={{ backgroundColor: "#dde5d4" }}>
        <SkillTreeFlow skills={step.skills} layers={step.layers} selectedTrees={step.selectedTrees} />
      </div>
    </div>
  );
}
