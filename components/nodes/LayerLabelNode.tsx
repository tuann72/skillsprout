import { useEffect, useState } from "react";
import { type Node, type NodeProps } from "@xyflow/react";

export type LayerLabelData = {
  label: string;
  theme: string;
  layerNumber: number;
  animationDelay?: number;
};

export type LayerLabelNodeType = Node<LayerLabelData, "layerLabel">;

const layerColors: Record<number, string> = {
  0: "from-emerald-50 to-emerald-100/60 border-emerald-200 text-emerald-800",
  1: "from-sky-50 to-sky-100/60 border-sky-200 text-sky-800",
  2: "from-amber-50 to-amber-100/60 border-amber-200 text-amber-800",
  3: "from-rose-50 to-rose-100/60 border-rose-200 text-rose-800",
  4: "from-purple-50 to-purple-100/60 border-purple-200 text-purple-800",
};

function colorForLayer(n: number): string {
  return layerColors[n] ?? layerColors[0]!;
}

export function LayerLabelNode({ data }: NodeProps<LayerLabelNodeType>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => setVisible(true),
      data.animationDelay ?? 0,
    );
    return () => clearTimeout(timeout);
  }, [data.animationDelay]);

  return (
    <div
      className={`pointer-events-none flex select-none items-center gap-2 rounded-lg border bg-gradient-to-r px-4 py-2 shadow-sm transition-opacity duration-800 ease-out ${colorForLayer(data.layerNumber)}`}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <span className="text-xs font-bold uppercase tracking-wider opacity-50">
        Layer {data.layerNumber}
      </span>
      <span className="text-sm font-semibold">{data.theme}</span>
    </div>
  );
}
