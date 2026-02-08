"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
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
import { LayerLabelNode } from "./nodes/LayerLabelNode";
import type { LayerLabelData } from "./nodes/LayerLabelNode";
import type { LessonPlan, Difficulty, Layer } from "@/types/lesson-plan";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ---- Types ----

/** A single skill ready for the tree. Can come from convertLessonPlan or be built by hand. */
export type Skill = {
  id: string;
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
};

// ---- LLM output → Skill[] + Layer[] converter ----

export type ConvertedPlan = {
  skills: Skill[];
  layers: Layer[];
};

/**
 * Converts the structured LLM output (LessonPlan) into a flat Skill array
 * that the tree can render. `connections` (prerequisites) become parentIds,
 * and childIds are derived as the reverse. Also passes through layer metadata.
 */
export function convertLessonPlan(plan: LessonPlan): ConvertedPlan {
  const lessons = plan.lessons;

  // Build a lookup: lesson_number → child lesson_numbers
  const childMap = new Map<number, number[]>();
  for (const lesson of lessons) {
    for (const prereq of lesson.connections) {
      const existing = childMap.get(prereq) ?? [];
      existing.push(lesson.lesson_number);
      childMap.set(prereq, existing);
    }
  }

  const skills: Skill[] = lessons.map((lesson) => ({
    id: String(lesson.lesson_number),
    label: lesson.topic,
    description: lesson.description,
    difficulty: lesson.difficulty,
    resources: lesson.resources,
    durationMinutes: lesson.duration_minutes,
    lessonNumber: lesson.lesson_number,
    layer: lesson.layer,
    parentIds: lesson.connections.map(String),
    childIds: (childMap.get(lesson.lesson_number) ?? []).map(String),
    completed: false,
  }));

  return { skills, layers: plan.layers ?? [] };
}

// ---- Helpers: convert a flat skill list → React Flow nodes + edges ----

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dagre = require("@dagrejs/dagre");

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const LABEL_OFFSET_Y = -40; // label sits above the skill nodes in each layer

function buildFlow(
  skills: Skill[],
  layers: Layer[] = []
): {
  nodes: (Node<SkillNodeData> | Node<LayerLabelData>)[];
  edges: Edge[];
} {
  // Build layer theme lookup
  const themeMap = new Map<number, string>();
  for (const layer of layers) {
    themeMap.set(layer.layer_number, layer.theme);
  }

  // Build edges first (needed for dagre)
  const edges: Edge[] = skills.flatMap((skill) =>
    (skill.childIds ?? []).map((childId) => ({
      id: `e-${skill.id}-${childId}`,
      source: skill.id,
      target: childId,
    }))
  );

  // Set up dagre graph for optimized node placement
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 120, align: "UL" });

  for (const skill of skills) {
    g.setNode(skill.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Build skill nodes using dagre-computed positions
  // Compute layer order for staggered fade-in (all nodes in same layer share delay)
  const uniqueLayers = [...new Set(skills.map((s) => s.layer ?? 0))].sort((a, b) => a - b);
  const layerIndex = new Map(uniqueLayers.map((l, i) => [l, i]));

  const skillNodes: Node<SkillNodeData>[] = skills.map((skill) => {
    const pos = g.node(skill.id);
    return {
      id: skill.id,
      type: "skill" as const,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        label: skill.label,
        description: skill.description,
        difficulty: skill.difficulty,
        resources: skill.resources,
        durationMinutes: skill.durationMinutes,
        lessonNumber: skill.lessonNumber,
        layer: skill.layer,
        parentIds: skill.parentIds,
        childIds: skill.childIds,
        completed: skill.completed ?? false,
        animationDelay: (layerIndex.get(skill.layer ?? 0) ?? 0) * 150,
      },
    };
  });

  // Compute layer Y positions from dagre output (average Y per layer)
  const layerYMap = new Map<number, number[]>();
  for (const skill of skills) {
    const l = skill.layer ?? 0;
    const pos = g.node(skill.id);
    const ys = layerYMap.get(l) ?? [];
    ys.push(pos.y);
    layerYMap.set(l, ys);
  }

  // Layer label nodes — one per layer, centered above the row
  const sortedLayers = [...layerYMap.keys()].sort((a, b) => a - b);
  const labelNodes: Node<LayerLabelData>[] = sortedLayers.map((layerNum) => {
    const ys = layerYMap.get(layerNum) ?? [0];
    const minY = Math.min(...ys);
    const theme = themeMap.get(layerNum) ?? `Layer ${layerNum}`;

    return {
      id: `layer-label-${layerNum}`,
      type: "layerLabel" as const,
      position: { x: 0, y: minY - NODE_HEIGHT / 2 + LABEL_OFFSET_Y },
      data: {
        label: theme,
        theme,
        layerNumber: layerNum,
        animationDelay: (layerIndex.get(layerNum) ?? 0) * 150,
      },
      selectable: false,
      draggable: false,
    };
  });

  return { nodes: [...labelNodes, ...skillNodes], edges };
}

// ---- Demo data matching the LLM output shape ----

const demoPlan: LessonPlan = {
  title: "Web Development Fundamentals",
  skill: "Web Development",
  estimated_minutes: 360,
  objectives: [
    "Understand HTML & CSS basics",
    "Write JavaScript confidently",
    "Build components with React",
    "Connect a frontend to a backend",
  ],
  layers: [
    { layer_number: 0, theme: "Foundations" },
    { layer_number: 1, theme: "Core Web Languages" },
    { layer_number: 2, theme: "Frameworks & APIs" },
    { layer_number: 3, theme: "Full-Stack Integration" },
  ],
  lessons: [
    {
      lesson_number: 1,
      layer: 0,
      topic: "HTML Basics",
      difficulty: "beginner",
      description:
        "Learn semantic HTML elements, document structure, and how browsers render pages.",
      resources: [
        "https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML",
      ],
      duration_minutes: 45,
      connections: [],
    },
    {
      lesson_number: 2,
      layer: 1,
      topic: "CSS Fundamentals",
      difficulty: "beginner",
      description:
        "Style your pages with selectors, the box model, flexbox, and responsive design basics.",
      resources: ["https://web.dev/learn/css"],
      duration_minutes: 60,
      connections: [1],
    },
    {
      lesson_number: 3,
      layer: 1,
      topic: "JavaScript Essentials",
      difficulty: "intermediate",
      description:
        "Variables, functions, DOM manipulation, and asynchronous programming with promises.",
      resources: ["https://javascript.info"],
      duration_minutes: 90,
      connections: [1],
    },
    {
      lesson_number: 4,
      layer: 2,
      topic: "React Basics",
      difficulty: "intermediate",
      description:
        "Components, JSX, props, state, and the React rendering lifecycle.",
      resources: ["https://react.dev/learn"],
      duration_minutes: 60,
      connections: [2],
    },
    {
      lesson_number: 5,
      layer: 2,
      topic: "REST APIs & Fetch",
      difficulty: "advanced",
      description:
        "Consume REST APIs, handle loading/error states, and display server data in your UI.",
      resources: [
        "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch",
      ],
      duration_minutes: 45,
      connections: [3],
    },
    {
      lesson_number: 6,
      layer: 3,
      topic: "Full-Stack App",
      difficulty: "advanced",
      description:
        "Connect your React frontend to a backend API and deploy the full application.",
      resources: ["https://nextjs.org/docs"],
      duration_minutes: 60,
      connections: [4],
    },
  ],
};

const { skills: demoSkills, layers: demoLayers } = convertLessonPlan(demoPlan);

// ---- Difficulty display helpers ----

const difficultyLabel: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
};

const difficultyColor: Record<Difficulty, string> = {
  beginner: "text-emerald-600",
  intermediate: "text-sky-600",
  advanced: "text-amber-600",
  expert: "text-rose-600",
};

// ---- Component ----

const nodeTypes = { skill: SkillNode, layerLabel: LayerLabelNode };

export type SkillTreeFlowProps = {
  skills?: Skill[];
  layers?: Layer[];
  planId?: string | null;
  lessonDbIds?: Record<number, string>;
};

function SkillTreeFlow({
  skills = demoSkills,
  layers = demoLayers,
  planId,
  lessonDbIds,
}: SkillTreeFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlow(skills, layers),
    [skills, layers]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes] = useState<Node<any>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<SkillNodeData> | null>(
    null
  );

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildFlow(skills, layers);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
  }, [skills, layers]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((prev) => applyNodeChanges(changes, prev)),
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
    // Ignore clicks on layer label nodes
    if (node.type === "layerLabel") return;
    setSelectedNode(node as Node<SkillNodeData>);
  }, []);

  /** Toggle the completed state on the currently-selected node. */
  const toggleComplete = useCallback(async () => {
    if (!selectedNode) return;
    const id = selectedNode.id;
    const wasCompleted = selectedNode.data.completed;
    const newCompleted = !wasCompleted;

    // Optimistic update
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, completed: newCompleted } }
          : n
      )
    );
    setSelectedNode((prev) =>
      prev
        ? { ...prev, data: { ...prev.data, completed: newCompleted } }
        : null
    );

    // Persist to DB if authenticated with a saved plan
    if (planId && lessonDbIds) {
      const lessonNumber = selectedNode.data.lessonNumber;
      const lessonDbId = lessonNumber != null ? lessonDbIds[lessonNumber] : undefined;
      if (lessonDbId) {
        try {
          const res = await fetch("/api/lesson-completions", {
            method: newCompleted ? "POST" : "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lesson_id: lessonDbId }),
          });
          if (!res.ok) throw new Error("Failed to save");
        } catch {
          // Revert on failure
          setNodes((prev) =>
            prev.map((n) =>
              n.id === id
                ? { ...n, data: { ...n.data, completed: wasCompleted } }
                : n
            )
          );
          setSelectedNode((prev) =>
            prev
              ? { ...prev, data: { ...prev.data, completed: wasCompleted } }
              : null
          );
        }
      }
    }
  }, [selectedNode, planId, lessonDbIds]);

  const progress = useMemo(() => {
    const skillNodes = nodes.filter((n) => n.type === "skill");
    const total = skillNodes.length;
    const completed = skillNodes.filter((n) => n.data?.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const treeImage =
      percentage >= 100
        ? "/t5.png"
        : percentage >= 75
          ? "/t4.png"
          : percentage >= 50
            ? "/t3.png"
            : percentage >= 25
              ? "/t2.png"
              : "/t1.png";
    return { completed, total, percentage, treeImage };
  }, [nodes]);

  const hasFiredConfetti = useRef(false);
  useEffect(() => {
    if (progress.percentage >= 100 && !hasFiredConfetti.current) {
      hasFiredConfetti.current = true;
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 1 },
      });
    } else if (progress.percentage < 100) {
      hasFiredConfetti.current = false;
    }
  }, [progress.percentage]);

  const d = selectedNode?.data;

  return (
    <div className="h-full w-full">
      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-3 bg-white/90 backdrop-blur-sm shadow-md rounded-lg px-4 py-2">
          <Image src={progress.treeImage} alt="Progress tree" width={progress.percentage >= 100 ? 40 : 32} height={progress.percentage >= 100 ? 40 : 32} />
          <Progress value={progress.percentage} className="w-40 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
          <span className="text-sm font-medium text-zinc-700 whitespace-nowrap">
            {progress.completed}/{progress.total} completed
          </span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodesDraggable={false}
        fitView
      >
        <Background style={{ backgroundColor: "#dde5d4" }} />
        <Controls />
      </ReactFlow>

      {/* ---- Node detail dialog ---- */}
      <Dialog
        open={selectedNode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedNode(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {d?.label ?? "Skill"}
              {d?.completed && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Completed
                </span>
              )}
            </DialogTitle>

            {d?.difficulty && (
              <p
                className={`text-xs font-semibold ${difficultyColor[d.difficulty]}`}
              >
                {difficultyLabel[d.difficulty]}
                {d.durationMinutes != null && ` · ${d.durationMinutes} min`}
              </p>
            )}

            <DialogDescription className="pt-1">
              {d?.description ?? "No description provided."}
            </DialogDescription>
          </DialogHeader>

          {/* Resources */}
          {d?.resources && d.resources.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-zinc-700">Resources</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {d.resources.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              variant={d?.completed ? "outline" : "default"}
              onClick={toggleComplete}
              className="w-full"
            >
              {d?.completed ? "Mark as incomplete" : "Mark as complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SkillTreeFlow;
