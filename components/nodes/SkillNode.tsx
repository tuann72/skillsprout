"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type SkillNodeData = {
  label?: string;
  description?: string;
};

export type SkillNodeType = Node<SkillNodeData, "skill">;

export function SkillNode({ data, selected }: NodeProps<SkillNodeType>) {
  const label = data?.label ?? "Skill";

  return (
    <div
      className={`
        min-w-[120px] rounded-md border-2 bg-white px-3 py-2 text-center shadow
        ${selected ? "border-amber-500 ring-2 ring-amber-500/30" : "border-zinc-300"}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !-top-1.5 !border-2 !border-zinc-400 !bg-white"
      />
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !-bottom-1.5 !border-2 !border-zinc-400 !bg-white"
      />
    </div>
  );
}
