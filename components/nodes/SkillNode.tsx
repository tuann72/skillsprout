import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

// ---- Data shape ----
// Mirrors what the backend model will eventually provide.
// `parentIds` and `childIds` aren't used by the node component itself,
// but they travel through React Flow's `data` so the tree wrapper can
// derive edges from them.
export type SkillNodeData = {
  label: string;
  description?: string;
  parentIds?: string[];
  childIds?: string[];
};

export type SkillNodeType = Node<SkillNodeData, "skill">;

export function SkillNode({ data, selected }: NodeProps<SkillNodeType>) {
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
        className="!h-2 !w-2 !min-h-0 !min-w-0 !border-0 !bg-transparent"
      />
      <span className="text-sm font-medium text-zinc-800">{data.label}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !min-h-0 !min-w-0 !border-0 !bg-transparent"
      />
    </div>
  );
}
