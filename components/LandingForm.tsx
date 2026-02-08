"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type LandingFormData = {
  skillName: string;
  lessonCount: string;
  duration: string;
  commitment: string;
};

type LandingFormProps = {
  onSubmit: (data: LandingFormData) => void;
};

export function LandingForm({ onSubmit }: LandingFormProps) {
  const [skillName, setSkillName] = useState("");
  const [lessonCount, setLessonCount] = useState("");
  const [duration, setDuration] = useState("");
  const [commitment, setCommitment] = useState("");

  const canSubmit = skillName.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ skillName, lessonCount, duration, commitment });
  }

  return (
    <div className="relative z-20 flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: "#e8f5ff" }}>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">What do you want to learn?</CardTitle>
          <CardDescription>
            Tell us about your learning goals and we&apos;ll build a skill tree for
            you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Skill name */}
            <div className="space-y-2">
              <Label htmlFor="skill-name">Skill or topic</Label>
              <Input
                id="skill-name"
                placeholder="e.g. Web Development, Piano, Spanish…"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
              />
            </div>

            {/* Lesson count */}
            <div className="space-y-2">
              <Label htmlFor="lesson-count">How many lessons?</Label>
              <Select value={lessonCount} onValueChange={setLessonCount}>
                <SelectTrigger id="lesson-count">
                  <SelectValue placeholder="Pick a range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3-5">3 - 5 lessons</SelectItem>
                  <SelectItem value="6-10">6 - 10 lessons</SelectItem>
                  <SelectItem value="11-15">11 - 15 lessons</SelectItem>
                  <SelectItem value="15-20">15 - 20 lessons</SelectItem>
                  <SelectItem value="21-30">21 - 30 lessons</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">How long do you want to spend?</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Pick a timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-week">1 week</SelectItem>
                  <SelectItem value="2-weeks">2 weeks</SelectItem>
                  <SelectItem value="1-month">1 month</SelectItem>
                  <SelectItem value="3-months">3 months</SelectItem>
                  <SelectItem value="6-months">6 months</SelectItem>
                  <SelectItem value="1-year">1 year</SelectItem>
                  <SelectItem value="2-years">2 years</SelectItem>
                  <SelectItem value="3-plus-years">3+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Commitment */}
            <div className="space-y-2">
              <Label htmlFor="commitment">Daily time commitment</Label>
              <Select value={commitment} onValueChange={setCommitment}>
                <SelectTrigger id="commitment">
                  <SelectValue placeholder="Pick a commitment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15-min">15 minutes</SelectItem>
                  <SelectItem value="30-min">30 minutes</SelectItem>
                  <SelectItem value="1-hour">1 hour</SelectItem>
                  <SelectItem value="2-hours">2+ hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
