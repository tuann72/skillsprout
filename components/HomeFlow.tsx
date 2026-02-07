"use client";

import { useState } from "react";
import { LandingForm, type LandingFormData } from "./LandingForm";
import { LevelSelect, type SkillLevel } from "./LevelSelect";
import SkillTreeFlow from "./SkillTreeFlow";
import { AIPanelArrow } from "@/components/custom/AI-panel-arrow";
import { NewDraftButton } from "@/components/custom/NewDraftButton";

type Step =
  | { kind: "form" }
  | { kind: "level"; formData: LandingFormData }
  | { kind: "tree"; formData: LandingFormData; level: SkillLevel };

export default function HomeFlow() {
  const [step, setStep] = useState<Step>({ kind: "form" });

  if (step.kind === "form") {
    return (
      <LandingForm
        onSubmit={(data) => setStep({ kind: "level", formData: data })}
      />
    );
  }

  if (step.kind === "level") {
    return (
      <LevelSelect
        skillName={step.formData.skillName}
        onSelect={(level) =>
          setStep({ kind: "tree", formData: step.formData, level })
        }
        onBack={() => setStep({ kind: "form" })}
      />
    );
  }

  // step.kind === "tree"
  return (
    <div className="relative h-screen w-screen">
      <div className="fixed top-4 right-4 z-20">
        <NewDraftButton />
      </div>
      <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
        <AIPanelArrow />
      </div>
      <div className="absolute inset-0 z-0 bg-white">
        <SkillTreeFlow />
      </div>
    </div>
  );
}
