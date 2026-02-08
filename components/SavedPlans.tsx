"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

type SavedPlan = {
  id: string;
  title: string;
  skill: string;
  estimated_minutes: number;
  created_at: string;
  lesson_count: number;
  completed_count: number;
};

type SavedPlansProps = {
  onSelect: (planId: string) => void;
  onBack: () => void;
};

export function SavedPlans({ onSelect, onBack }: SavedPlansProps) {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/lesson-plans");
        if (!res.ok) throw new Error("Failed to load plans");
        const data = await res.json();
        setPlans(data.plans);
      } catch {
        setError("Could not load your saved plans.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div
      className="flex min-h-screen flex-col items-center p-8"
      style={{ backgroundColor: "#dde5d4" }}
    >
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-zinc-900">My Plans</h1>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && plans.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No saved plans yet. Generate your first lesson plan!
          </p>
        )}

        <div className="space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => onSelect(plan.id)}
              className="w-full rounded-lg bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground">{plan.skill}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(plan.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${plan.lesson_count > 0 ? (plan.completed_count / plan.lesson_count) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {plan.completed_count}/{plan.lesson_count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
