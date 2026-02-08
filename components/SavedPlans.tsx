"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, Download, Loader2, Plus, Trash2 } from "lucide-react";

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
  onGenerateNew: () => void;
};

export function SavedPlans({ onSelect, onGenerateNew }: SavedPlansProps) {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedPlan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  async function handleDelete() {
    if (!deleteTarget) return;
    const planToDelete = deleteTarget;
    setDeleting(true);

    // Optimistic removal
    setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/lesson-plans/${planToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setPlans((prev) => [...prev, planToDelete]);
    } finally {
      setDeleting(false);
    }
  }

  async function fetchPlanData(planId: string) {
    const res = await fetch(`/api/lesson-plans/${planId}`);
    if (!res.ok) throw new Error("Failed to fetch plan");
    const data = await res.json();
    const { title, skill, estimated_minutes, objectives, layers, lessons } =
      data;
    return { title, skill, estimated_minutes, objectives, layers, lessons };
  }

  async function handleExport(planId: string, title: string) {
    try {
      const planData = await fetchPlanData(planId);
      const blob = new Blob([JSON.stringify(planData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }

  async function handleCopy(planId: string) {
    try {
      const planData = await fetchPlanData(planId);
      await navigator.clipboard.writeText(JSON.stringify(planData, null, 2));
      setCopiedId(planId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // silently fail
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center p-8"
      style={{ backgroundColor: "#dde5d4" }}
    >
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">My Plans</h1>

        <Button
          className="mb-6 w-full cursor-pointer gap-2 bg-emerald-500 hover:bg-emerald-600"
          onClick={onGenerateNew}
        >
          <Plus className="h-4 w-4" />
          Generate New Plan
        </Button>

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
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className="flex items-center gap-2 rounded-lg bg-white shadow-sm transition hover:shadow-md animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                onClick={() => onSelect(plan.id)}
                className="flex-1 cursor-pointer p-4 text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-900">
                      {plan.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.skill}
                    </p>
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
              <div className="mr-2 flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer hover:text-zinc-700"
                  onClick={() => handleExport(plan.id, plan.title)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer hover:text-zinc-700"
                  onClick={() => handleCopy(plan.id)}
                >
                  {copiedId === plan.id ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer hover:text-destructive"
                  onClick={() => setDeleteTarget(plan)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete plan?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; and all its progress will be
              permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              onClick={handleDelete}
              disabled={deleting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
