"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type SkillLevel = "brand-new" | "beginner" | "intermediate" | "advanced";

type LevelOption = {
  value: SkillLevel;
  title: string;
  description: string;
};

// Seed descriptions — will be replaced by AI-generated ones later.
const levels: LevelOption[] = [
  {
    value: "brand-new",
    title: "Brand New",
    description:
      "You've never explored this topic before. We'll start from the very beginning and introduce core vocabulary and concepts.",
  },
  {
    value: "beginner",
    title: "Beginner",
    description:
      "You've dabbled a little or seen some introductory material but haven't built anything on your own yet.",
  },
  {
    value: "intermediate",
    title: "Intermediate",
    description:
      "You're comfortable with the basics and have some hands-on experience. Ready to go deeper and tackle real-world challenges.",
  },
  {
    value: "advanced",
    title: "Advanced",
    description:
      "You have solid experience and understand most concepts well. Looking to master edge cases, optimisation, and expert-level techniques.",
  },
];

type LevelSelectProps = {
  skillName: string;
  onSelect: (level: SkillLevel) => void;
  onBack: () => void;
};

export function LevelSelect({ skillName, onSelect, onBack }: LevelSelectProps) {
  const [selected, setSelected] = useState<SkillLevel | null>(null);

  return (
    <div className="relative z-20 flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: "#dde5d4" }}>
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            How experienced are you with{" "}
            <span className="text-primary">{skillName}</span>?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the level that best describes where you are right now.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {levels.map((level) => {
            const isActive = selected === level.value;
            return (
              <Card
                key={level.value}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  isActive
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                }`}
                onClick={() => setSelected(level.value)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{level.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{level.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button disabled={!selected} onClick={() => selected && onSelect(selected)}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
