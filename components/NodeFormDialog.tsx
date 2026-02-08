"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import type { Difficulty } from "@/types/lesson-plan";

export type NodeFormValues = {
  label: string;
  description: string;
  difficulty: Difficulty;
  durationMinutes: number;
  resources: string[];
  layer?: number;
  connections?: number[];
};

export type ExistingLesson = {
  lessonNumber: number;
  topic: string;
  layer: number;
};

type NodeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "modify" | "create";
  initialValues?: Partial<NodeFormValues>;
  onSubmit: (values: NodeFormValues) => void;
  existingLessons?: ExistingLesson[];
  availableLayers?: { layer_number: number; theme: string }[];
};

export function NodeFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
  existingLessons,
  availableLayers,
}: NodeFormDialogProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [resources, setResources] = useState<string[]>([]);
  const [layer, setLayer] = useState(0);
  const [connections, setConnections] = useState<number[]>([]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setLabel(initialValues?.label ?? "");
      setDescription(initialValues?.description ?? "");
      setDifficulty(initialValues?.difficulty ?? "beginner");
      setDurationMinutes(initialValues?.durationMinutes ?? 30);
      setResources(initialValues?.resources ?? []);
      setLayer(initialValues?.layer ?? 0);
      setConnections(initialValues?.connections ?? []);
    }
  }, [open, initialValues]);

  // Filter available prerequisites: lessons in any layer below the selected one
  const availablePrereqs = (existingLessons ?? []).filter(
    (l) => l.layer < layer
  );

  // When layer changes, remove connections that are no longer valid
  useEffect(() => {
    if (mode === "create") {
      const validNumbers = new Set(
        (existingLessons ?? []).filter((l) => l.layer < layer).map((l) => l.lessonNumber)
      );
      setConnections((prev) => prev.filter((c) => validNumbers.has(c)));
    }
  }, [layer, mode, existingLessons]);

  const toggleConnection = (lessonNumber: number) => {
    setConnections((prev) =>
      prev.includes(lessonNumber)
        ? prev.filter((c) => c !== lessonNumber)
        : [...prev, lessonNumber]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      label,
      description,
      difficulty,
      durationMinutes,
      resources,
      ...(mode === "create" ? { layer, connections } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "modify" ? "Modify Lesson" : "Create Lesson"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-topic">Topic</Label>
            <Input
              id="node-topic"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-description">Description</Label>
            <textarea
              id="node-description"
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="node-duration">Duration (min)</Label>
              <Input
                id="node-duration"
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Layer selector — create mode only */}
          {mode === "create" && availableLayers && availableLayers.length > 0 && (
            <div className="space-y-2">
              <Label>Layer</Label>
              <Select
                value={String(layer)}
                onValueChange={(v) => setLayer(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLayers.map((l) => (
                    <SelectItem key={l.layer_number} value={String(l.layer_number)}>
                      Layer {l.layer_number} — {l.theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Prerequisites — create mode only, shown when layer > 0 */}
          {mode === "create" && layer > 0 && availablePrereqs.length > 0 && (
            <div className="space-y-2">
              <Label>Prerequisites</Label>
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-md border p-2">
                {availablePrereqs.map((lesson) => (
                  <label
                    key={lesson.lessonNumber}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-1 py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={connections.includes(lesson.lessonNumber)}
                      onChange={() => toggleConnection(lesson.lessonNumber)}
                      className="rounded"
                    />
                    <span className="text-muted-foreground text-xs">L{lesson.layer}</span>
                    {lesson.topic}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Resources</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setResources([...resources, ""])}
              >
                + Add
              </Button>
            </div>
            {resources.map((url, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => {
                    const next = [...resources];
                    next[i] = e.target.value;
                    setResources(next);
                  }}
                  placeholder="https://..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setResources(resources.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "modify" ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
