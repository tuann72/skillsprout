"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { SkillNode } from "./nodes/SkillNode";
import type { SkillNodeData } from "./nodes/SkillNode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ---- Types ----

/** A single skill as it would come from the backend model. */
export type Skill = {
  id: string;
  label: string;
  description?: string;
  parentIds?: string[];
  childIds?: string[];
};

// ---- Helpers: convert a flat skill list → React Flow nodes + edges ----

const NODE_GAP_X = 200;
const NODE_GAP_Y = 140;

/**
 * Takes a flat list of skills (each knowing its own parentIds / childIds)
 * and returns React Flow `nodes` and `edges`.
 *
 * Position is computed with a simple BFS-based tree layout.
 * When the backend is wired up, just pass the fetched skills here.
 */
function buildFlow(skills: Skill[]): {
  nodes: Node<SkillNodeData>[];
  edges: Edge[];
} {
  const byId = new Map(skills.map((s) => [s.id, s]));

  // Find root(s): skills with no parents (or whose parents aren't in the list)
  const roots = skills.filter(
    (s) => !s.parentIds?.length || s.parentIds.every((pid) => !byId.has(pid))
  );

  // BFS to assign depth + horizontal index per depth level
  const positions = new Map<string, { depth: number; index: number }>();
  const childrenByDepth = new Map<number, string[]>();
  const queue: { id: string; depth: number }[] = roots.map((r) => ({
    id: r.id,
    depth: 0,
  }));

  while (queue.length) {
    const { id, depth } = queue.shift()!;
    if (positions.has(id)) continue;

    const row = childrenByDepth.get(depth) ?? [];
    positions.set(id, { depth, index: row.length });
    row.push(id);
    childrenByDepth.set(depth, row);

    const skill = byId.get(id);
    skill?.childIds?.forEach((cid) => {
      if (!positions.has(cid)) queue.push({ id: cid, depth: depth + 1 });
    });
  }

  // Center each depth row around x = 0
  const nodes: Node<SkillNodeData>[] = skills.map((skill) => {
    const pos = positions.get(skill.id) ?? { depth: 0, index: 0 };
    const rowCount = childrenByDepth.get(pos.depth)?.length ?? 1;
    const rowWidth = (rowCount - 1) * NODE_GAP_X;
    const x = pos.index * NODE_GAP_X - rowWidth / 2;
    const y = pos.depth * NODE_GAP_Y;

    return {
      id: skill.id,
      type: "skill" as const,
      position: { x, y },
      data: {
        label: skill.label,
        description: skill.description,
        parentIds: skill.parentIds,
        childIds: skill.childIds,
      },
    };
  });

  // Derive edges from childIds
  const edges: Edge[] = skills.flatMap((skill) =>
    (skill.childIds ?? []).map((childId) => ({
      id: `e-${skill.id}-${childId}`,
      source: skill.id,
      target: childId,
    }))
  );

  return { nodes, edges };
}

// ---- Demo data (replace with API fetch later) ----

const demoSkills: Skill[] = [
  {
    id: "root",
    label: "Fundamentals",
    description: "Core concepts every developer should know.",
    childIds: ["frontend", "backend"],
  },
  {
    id: "frontend",
    label: "Frontend",
    description: "Building user interfaces for the web.",
    parentIds: ["root"],
    childIds: ["html-css", "javascript", "react"],
  },
  {
    id: "backend",
    label: "Backend",
    description: "Server-side logic, APIs, and databases.",
    parentIds: ["root"],
  },
  {
    id: "html-css",
    label: "HTML & CSS",
    description: "Structure and style the web.",
    parentIds: ["frontend"],
  },
  {
    id: "javascript",
    label: "JavaScript",
    description: "The language of the web.",
    parentIds: ["frontend"],
  },
  {
    id: "react",
    label: "React",
    description: "A library for building component-based UIs.",
    parentIds: ["frontend"],
  },
];

// ---- Component ----

const nodeTypes = { skill: SkillNode };

export type SkillTreeFlowProps = {
  /** Flat list of skills. Defaults to demo data when omitted. */
  skills?: Skill[];
};

function SkillTreeFlow({ skills = demoSkills }: SkillTreeFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlow(skills),
    [skills]
  );

  const [nodes, setNodes] = useState<Node<SkillNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<SkillNodeData> | null>(null);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((prev) => applyNodeChanges(changes, prev) as Node<SkillNodeData>[]),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((prev) => applyEdgeChanges(changes, prev)),
    []
  );
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((prev) => addEdge(params, prev)),
    []
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode(node as Node<SkillNodeData>);
  }, []);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      <Dialog
        open={selectedNode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedNode(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNode?.data?.label ?? "Skill"}</DialogTitle>
            <DialogDescription>
              {selectedNode?.data?.description ?? "No description provided."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SkillTreeFlow;
