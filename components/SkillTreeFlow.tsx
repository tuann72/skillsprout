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
import { NodeFormDialog } from "./NodeFormDialog";
import type { NodeFormValues } from "./NodeFormDialog";
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
function buildFlow(
  skills: Skill[],
): {
  nodes: Node<SkillNodeData>[];
  edges: Edge[];
} {
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

  const nodes: Node<SkillNodeData>[] = skills.map((skill) => {
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
        animationDelay: (layerIndex.get(skill.layer ?? 0) ?? 0) * 250,
      },
    };
  });

  return { nodes, edges };
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

const nodeTypes = { skill: SkillNode };

const defaultEdgeOptions = {
  style: {
    stroke: "#8B6914",
    strokeWidth: 2.5,
  },
};

export type SkillTreeFlowProps = {
  skills?: Skill[];
  layers?: Layer[];
  planId?: string | null;
  lessonDbIds?: Record<number, string>;
  createDialogOpen?: boolean;
  onCreateDialogChange?: (open: boolean) => void;
  onNodeCreated?: (lesson: {
    lessonNumber: number;
    lessonDbId: string;
    topic: string;
    description: string;
    difficulty: Difficulty;
    durationMinutes: number;
    resources: string[];
    layer: number;
    connections: number[];
  }) => void;
};

function SkillTreeFlow({
  skills = demoSkills,
  layers = demoLayers,
  planId,
  lessonDbIds,
  createDialogOpen = false,
  onCreateDialogChange,
  onNodeCreated,
}: SkillTreeFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlow(skills),
    [skills]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes] = useState<Node<any>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<SkillNodeData> | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildFlow(skills);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
  }, [skills]);

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

  /** Modify the selected node's fields. */
  const handleModifyNode = useCallback(
    async (values: NodeFormValues) => {
      if (!selectedNode) return;
      const id = selectedNode.id;
      const prevData = selectedNode.data;

      const updatedData: SkillNodeData = {
        ...prevData,
        label: values.label,
        description: values.description,
        difficulty: values.difficulty,
        durationMinutes: values.durationMinutes,
        resources: values.resources,
      };

      // Optimistic update
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: updatedData } : n))
      );
      setSelectedNode((prev) =>
        prev ? { ...prev, data: updatedData } : null
      );
      setEditDialogOpen(false);

      // Persist to DB
      if (planId && lessonDbIds) {
        const lessonNumber = selectedNode.data.lessonNumber;
        const lessonDbId =
          lessonNumber != null ? lessonDbIds[lessonNumber] : undefined;
        if (lessonDbId) {
          try {
            const res = await fetch(`/api/lessons/${lessonDbId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topic: values.label,
                description: values.description,
                difficulty: values.difficulty,
                duration_minutes: values.durationMinutes,
                resources: values.resources,
              }),
            });
            if (!res.ok) throw new Error("Failed to save");
          } catch {
            // Revert on failure
            setNodes((prev) =>
              prev.map((n) => (n.id === id ? { ...n, data: prevData } : n))
            );
            setSelectedNode((prev) =>
              prev ? { ...prev, data: prevData } : null
            );
          }
        }
      }
    },
    [selectedNode, planId, lessonDbIds]
  );

  /** Delete the selected node and orphan its children (remove edges). */
  const handleDeleteNode = useCallback(async () => {
    if (!selectedNode) return;
    const id = selectedNode.id;
    const prevNodes = nodes;
    const prevEdges = edges;

    // Optimistic update: remove node and its edges
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) =>
      prev.filter((e) => e.source !== id && e.target !== id)
    );
    setSelectedNode(null);

    // Persist to DB
    if (planId && lessonDbIds) {
      const lessonNumber = selectedNode.data.lessonNumber;
      const lessonDbId =
        lessonNumber != null ? lessonDbIds[lessonNumber] : undefined;
      if (lessonDbId) {
        try {
          const res = await fetch(`/api/lessons/${lessonDbId}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete");
        } catch {
          // Revert on failure
          setNodes(prevNodes);
          setEdges(prevEdges);
        }
      }
    }
  }, [selectedNode, nodes, edges, planId, lessonDbIds]);

  /** Create a new node and persist to DB. */
  const handleCreateNode = useCallback(
    async (values: NodeFormValues) => {
      const newLayer = values.layer ?? 0;
      const newConnections = values.connections ?? [];

      // Compute next lesson_number from current skill nodes
      const skillNodes = nodes.filter((n) => n.type === "skill");
      const maxNum = skillNodes.reduce(
        (max, n) => Math.max(max, n.data?.lessonNumber ?? 0),
        0
      );
      const newLessonNumber = maxNum + 1;
      const newId = String(newLessonNumber);

      // Build the new skill node
      const newSkill: Skill = {
        id: newId,
        label: values.label,
        description: values.description,
        difficulty: values.difficulty,
        resources: values.resources,
        durationMinutes: values.durationMinutes,
        lessonNumber: newLessonNumber,
        layer: newLayer,
        parentIds: newConnections.map(String),
        childIds: [],
      };

      // Rebuild the full skills array so dagre can re-layout
      const currentSkills: Skill[] = skillNodes.map((n) => ({
        id: n.id,
        label: n.data.label,
        description: n.data.description,
        difficulty: n.data.difficulty,
        resources: n.data.resources,
        durationMinutes: n.data.durationMinutes,
        lessonNumber: n.data.lessonNumber,
        layer: n.data.layer,
        parentIds: n.data.parentIds,
        childIds: [
          ...(n.data.childIds ?? []),
          // If this existing node is a parent of the new node, add the new node as child
          ...(newConnections.includes(n.data.lessonNumber) ? [newId] : []),
        ],
        completed: n.data.completed,
      }));
      currentSkills.push(newSkill);

      const { nodes: newNodes, edges: newEdges } = buildFlow(currentSkills);
      // Preserve completion state
      const completionMap = new Map(
        skillNodes.map((n) => [n.id, n.data.completed])
      );
      const finalNodes = newNodes.map((n) =>
        n.type === "skill" && completionMap.has(n.id)
          ? { ...n, data: { ...n.data, completed: completionMap.get(n.id) } }
          : n
      );

      setNodes(finalNodes);
      setEdges(newEdges);
      onCreateDialogChange?.(false);

      // Persist to DB
      if (planId) {
        try {
          const res = await fetch("/api/lessons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan_id: planId,
              topic: values.label,
              description: values.description,
              difficulty: values.difficulty,
              duration_minutes: values.durationMinutes,
              resources: values.resources,
              layer: newLayer,
              connections: newConnections,
            }),
          });
          if (!res.ok) throw new Error("Failed to create lesson");
          const data = await res.json();
          onNodeCreated?.({
            lessonNumber: data.lesson_number,
            lessonDbId: data.lesson_id,
            topic: values.label,
            description: values.description,
            difficulty: values.difficulty,
            durationMinutes: values.durationMinutes,
            resources: values.resources,
            layer: newLayer,
            connections: newConnections,
          });
        } catch {
          // Revert: rebuild without the new node
          const { nodes: revertNodes, edges: revertEdges } = buildFlow(
            skillNodes.map((n) => ({
              id: n.id,
              label: n.data.label,
              description: n.data.description,
              difficulty: n.data.difficulty,
              resources: n.data.resources,
              durationMinutes: n.data.durationMinutes,
              lessonNumber: n.data.lessonNumber,
              layer: n.data.layer,
              parentIds: n.data.parentIds,
              childIds: n.data.childIds,
              completed: n.data.completed,
            }))
          );
          setNodes(revertNodes);
          setEdges(revertEdges);
        }
      }
    },
    [nodes, layers, planId, onCreateDialogChange, onNodeCreated]
  );

  // Build existing lessons list for the create dialog's prerequisites picker
  const existingLessonsForForm = useMemo(() => {
    return nodes
      .filter((n) => n.type === "skill")
      .map((n) => ({
        lessonNumber: n.data.lessonNumber as number,
        topic: n.data.label as string,
        layer: (n.data.layer as number) ?? 0,
      }));
  }, [nodes]);

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
        <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 flex items-center gap-2 sm:gap-3 bg-white/90 backdrop-blur-sm shadow-md rounded-lg px-3 sm:px-4 py-2 max-w-[calc(100%-7rem)] sm:max-w-none">
          <Image src={progress.treeImage} alt="Progress tree" width={progress.percentage >= 100 ? 40 : 32} height={progress.percentage >= 100 ? 40 : 32} />
          <Progress value={progress.percentage} className="w-24 sm:w-40 [&>[data-slot=progress-indicator]]:bg-emerald-500" />
          <span className="text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap">
            {progress.completed}/{progress.total}
          </span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background style={{ backgroundColor: "#e8f5ff" }} />
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

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteNode}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
            >
              Modify
            </Button>
            <Button
              variant={d?.completed ? "outline" : "default"}
              onClick={toggleComplete}
            >
              {d?.completed ? "Mark incomplete" : "Mark complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Modify node form dialog ---- */}
      <NodeFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="modify"
        initialValues={
          d
            ? {
                label: d.label,
                description: d.description,
                difficulty: d.difficulty,
                durationMinutes: d.durationMinutes,
                resources: d.resources,
              }
            : undefined
        }
        onSubmit={handleModifyNode}
      />

      {/* ---- Create node form dialog ---- */}
      <NodeFormDialog
        open={createDialogOpen}
        onOpenChange={(open) => onCreateDialogChange?.(open)}
        mode="create"
        existingLessons={existingLessonsForForm}
        availableLayers={layers.map((l) => ({
          layer_number: l.layer_number,
          theme: l.theme,
        }))}
        onSubmit={handleCreateNode}
      />
    </div>
  );
}

export default SkillTreeFlow;
