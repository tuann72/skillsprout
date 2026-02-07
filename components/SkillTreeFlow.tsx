"use client";

import { useCallback, useState } from "react";
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

const nodeTypes = { skill: SkillNode };

const initialNodes: Node<SkillNodeData>[] = [
  // Root
  {
    id: "root",
    type: "skill",
    position: { x: 300, y: 0 },
    data: { label: "Fundamentals", description: "Core concepts every developer should know." },
  },
  // Level 2 — two children of root
  {
    id: "left",
    type: "skill",
    position: { x: 100, y: 140 },
    data: { label: "Frontend", description: "Building user interfaces for the web." },
  },
  {
    id: "right",
    type: "skill",
    position: { x: 500, y: 140 },
    data: { label: "Backend", description: "Server-side logic, APIs, and databases." },
  },
  // Level 3 — three children of "left"
  {
    id: "left-1",
    type: "skill",
    position: { x: -50, y: 280 },
    data: { label: "HTML & CSS", description: "Structure and style the web." },
  },
  {
    id: "left-2",
    type: "skill",
    position: { x: 100, y: 280 },
    data: { label: "JavaScript", description: "The language of the web." },
  },
  {
    id: "left-3",
    type: "skill",
    position: { x: 250, y: 280 },
    data: { label: "React", description: "A library for building component-based UIs." },
  },
];

const initialEdges: Edge[] = [
  // Root → Level 2
  { id: "e-root-left", source: "root", target: "left" },
  { id: "e-root-right", source: "root", target: "right" },
  // Left → Level 3
  { id: "e-left-1", source: "left", target: "left-1" },
  { id: "e-left-2", source: "left", target: "left-2" },
  { id: "e-left-3", source: "left", target: "left-3" },
];

function SkillTreeFlow() {
  const [nodes, setNodes] = useState<Node<SkillNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<SkillNodeData> | null>(null);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((prev) => applyNodeChanges(changes, prev)),
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
