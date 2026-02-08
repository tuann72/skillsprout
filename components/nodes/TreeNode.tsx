"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

export type TreeNodeData = {
  src: string;
  scale?: number;
};

function TreeNodeComponent({ data }: NodeProps<TreeNodeData>) {
  const scale = data.scale ?? 1;

  return (
    <div
      style={{
        pointerEvents: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.src}
        alt=""
        style={{
          imageRendering: "pixelated",
          transform: `scale(${scale})`,
          transformOrigin: "bottom center",
        }}
      />
    </div>
  );
}

export const TreeNode = memo(TreeNodeComponent);
