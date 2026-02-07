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
import type { LessonPlan, Difficulty } from "@/types/lesson-plan";
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
  parentIds?: string[];
  childIds?: string[];
  completed?: boolean;
};

// ---- LLM output → Skill[] converter ----

/**
 * Converts the structured LLM output (LessonPlan) into a flat Skill array
 * that the tree can render. `connections` (prerequisites) become parentIds,
 * and childIds are derived as the reverse.
 */
export function convertLessonPlan(plan: LessonPlan): Skill[] {
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

  return lessons.map((lesson) => ({
    id: String(lesson.lesson_number),
    label: lesson.topic,
    description: lesson.description,
    difficulty: lesson.difficulty,
    resources: lesson.resources,
    durationMinutes: lesson.duration_minutes,
    lessonNumber: lesson.lesson_number,
    parentIds: lesson.connections.map(String),
    childIds: (childMap.get(lesson.lesson_number) ?? []).map(String),
    completed: false,
  }));
}

// ---- Helpers: convert a flat skill list → React Flow nodes + edges ----

const NODE_GAP_X = 220;
const NODE_GAP_Y = 160;

function buildFlow(skills: Skill[]): {
  nodes: Node<SkillNodeData>[];
  edges: Edge[];
} {
  const byId = new Map(skills.map((s) => [s.id, s]));

  // Root(s): no parents or parents not in list
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
        difficulty: skill.difficulty,
        resources: skill.resources,
        durationMinutes: skill.durationMinutes,
        lessonNumber: skill.lessonNumber,
        parentIds: skill.parentIds,
        childIds: skill.childIds,
        completed: skill.completed ?? false,
      },
    };
  });

  const edges: Edge[] = skills.flatMap((skill) =>
    (skill.childIds ?? []).map((childId) => ({
      id: `e-${skill.id}-${childId}`,
      source: skill.id,
      target: childId,
    }))
  );

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
  lessons: [
    {
      lesson_number: 1,
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
      topic: "CSS Fundamentals",
      difficulty: "beginner",
      description:
        "Style your pages with selectors, the box model, flexbox, and responsive design basics.",
      resources: [
        "https://web.dev/learn/css",
      ],
      duration_minutes: 60,
      connections: [1],
    },
    {
      lesson_number: 3,
      topic: "JavaScript Essentials",
      difficulty: "intermediate",
      description:
        "Variables, functions, DOM manipulation, and asynchronous programming with promises.",
      resources: [
        "https://javascript.info",
      ],
      duration_minutes: 90,
      connections: [1],
    },
    {
      lesson_number: 4,
      topic: "React Basics",
      difficulty: "intermediate",
      description:
        "Components, JSX, props, state, and the React rendering lifecycle.",
      resources: [
        "https://react.dev/learn",
      ],
      duration_minutes: 60,
      connections: [2, 3],
    },
    {
      lesson_number: 5,
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
      topic: "Full-Stack Integration",
      difficulty: "advanced",
      description:
        "Connect your React frontend to a backend API and deploy the full application.",
      resources: [
        "https://nextjs.org/docs",
      ],
      duration_minutes: 60,
      connections: [4, 5],
    },
  ],
};

const demoSkills: Skill[] = convertLessonPlan(demoPlan);

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

export type SkillTreeFlowProps = {
  skills?: Skill[];
};

function SkillTreeFlow({ skills = demoSkills }: SkillTreeFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFlow(skills),
    [skills]
  );

  const [nodes, setNodes] = useState<Node<SkillNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<SkillNodeData> | null>(
    null
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes(
        (prev) => applyNodeChanges(changes, prev) as Node<SkillNodeData>[]
      ),
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
  const toggleComplete = useCallback(() => {
    if (!selectedNode) return;
    const id = selectedNode.id;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, completed: !n.data.completed } }
          : n
      )
    );
    setSelectedNode((prev) =>
      prev
        ? { ...prev, data: { ...prev.data, completed: !prev.data.completed } }
        : null
    );
  }, [selectedNode]);

  const d = selectedNode?.data;

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
