import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CheckCircle2 } from "lucide-react";
import type { Difficulty } from "@/types/lesson-plan";

// ---- Data shape ----
// Maps 1-to-1 with a Lesson from the LLM output, plus UI state.
export type SkillNodeData = {
  label: string;
  description?: string;
  difficulty?: Difficulty;
  resources?: string[];
  durationMinutes?: number;
  lessonNumber?: number;
  layer?: number;
  parentIds?: string[];
  childIds?: string[];
  completed?: boolean;
  animationDelay?: number;
};

export type SkillNodeType = Node<SkillNodeData, "skill">;

const difficultyColors: Record<Difficulty, string> = {
  beginner: "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermediate: "bg-sky-50 text-sky-700 border-sky-200",
  advanced: "bg-amber-50 text-amber-700 border-amber-200",
  expert: "bg-rose-50 text-rose-700 border-rose-200",
};

export function SkillNode({ data, selected }: NodeProps<SkillNodeType>) {
  const completed = data.completed ?? false;

  return (
    <div
      className={`
        relative min-w-[140px] max-w-[180px] rounded-lg border-2 px-3 py-2.5 text-center shadow hover:scale-105
        ${
          completed
            ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/20"
            : selected
              ? "border-amber-500 bg-white ring-2 ring-amber-500/30"
              : "border-zinc-300 bg-white"
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !min-h-0 !min-w-0 !border-0 !bg-transparent"
      />

      {/* Completed checkmark */}
      {completed && (
        <div className="absolute -top-2.5 -right-2.5 rounded-full bg-white">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
      )}

      {/* Difficulty badge */}
      {data.difficulty && (
        <span
          className={`mb-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${difficultyColors[data.difficulty]}`}
        >
          {data.difficulty}
        </span>
      )}

      <span
        className={`block text-sm font-medium ${completed ? "text-emerald-800" : "text-zinc-800"}`}
      >
        {data.label}
      </span>

      {data.durationMinutes != null && (
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {data.durationMinutes >= 60
            ? `${(data.durationMinutes / 60).toFixed(data.durationMinutes % 60 === 0 ? 0 : 1)} hr`
            : `${data.durationMinutes} min`}
        </span>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !min-h-0 !min-w-0 !border-0 !bg-transparent"
      />
    </div>
  );
}
