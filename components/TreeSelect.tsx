"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type TreeOption = {
  id: string;
  src: string;
};

const trees: TreeOption[] = [
  { id: "t1", src: "/t1.gif" },
  { id: "t2", src: "/t2.gif" },
  { id: "t3", src: "/t3.gif" },
  { id: "t4", src: "/t4.gif" },
  { id: "t5", src: "/t5.gif" },
  { id: "t6", src: "/t6.gif" },
];

type TreeSelectProps = {
  onSelect: (selectedTrees: string[]) => void;
  onBack: () => void;
};

export function TreeSelect({ onSelect, onBack }: TreeSelectProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleTree = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  return (
    <div
      className="relative z-20 flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "#dde5d4" }}
    >
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Choose your trees
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the trees you want to decorate your skill tree with.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {trees.map((tree) => {
            const isActive = selected.includes(tree.id);
            return (
              <Card
                key={tree.id}
                className={`cursor-pointer p-4 flex items-center justify-center transition-shadow hover:shadow-md ${
                  isActive
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                }`}
                onClick={() => toggleTree(tree.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tree.src}
                  alt={tree.id}
                  className="h-24 w-auto"
                  style={{ imageRendering: "pixelated" }}
                />
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => onSelect(selected)}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
