# React Flow + Skill Tree — Implementation Outline

This doc outlines what you need to do to add **React Flow** to skillsprout with **your own node component** and **your own tree/canvas component**, for a skill-tree–style UI.

---

## 1. Install React Flow

**Package:** `@xyflow/react` (current package name; docs use this).

```bash
npm install @xyflow/react
```

- You need the **CSS** for React Flow to work:  
  `import '@xyflow/react/dist/style.css'`
- The **parent of `<ReactFlow />` must have explicit width and height** (e.g. `width: '100%'`, `height: '100%'` or fixed px).

---

## 2. Your Own “Tree” Component (Wrapper Around the Canvas)

React Flow doesn’t have a separate “tree” primitive; the “tree” is the **flow itself** — one `<ReactFlow />` instance with nodes and edges. Your “own component for the overall tree” will be a **wrapper component** that:

- Renders **one** `<ReactFlow />` (the canvas).
- Passes in:
  - `nodes` and `edges` (from state or props).
  - `nodeTypes` (so React Flow uses your custom node component).
  - `onNodesChange`, `onEdgesChange`, `onConnect` (and optionally `nodeOrigin`, `fitView`, etc.).
- Optionally composes built-in pieces:
  - `<Background />` (grid/dots).
  - `<Controls />` (zoom, fit view).
  - `<MiniMap />`, `<Panel />`, etc.

**Responsibilities of this wrapper:**

- Own (or receive) **nodes** and **edges** state.
- Define **nodeTypes** (mapping your custom type name → your custom node component).
- Apply **layout** if you want a tree layout (e.g. Dagre, or your own positions). Layout can live in this component or in a hook/utils used by it.
- Set **skill-tree–specific options** (e.g. `nodesDraggable`, `elementsSelectable`, `connectionMode`, `isValidConnection` to enforce “parent → child only” or “no cycles”).
- Ensure the container has **width/height** (e.g. full viewport or a fixed area).

So: **“My own component for the overall tree” = one wrapper that configures and renders `<ReactFlow />` with your nodes, edges, node types, and options.**

---

## 3. Your Own Node Component (Custom Nodes)

React Flow renders whatever you pass in `nodeTypes`. To use your own node:

### 3.1 Implement a custom node component

- It’s a **React component** that receives **node props** (e.g. `id`, `data`, `selected`, etc.). Use the `NodeProps` type from `@xyflow/react` for TypeScript.
- React Flow wraps it for selection, dragging, and connections; you just render the **content** (label, icon, progress, locked/unlocked, etc.).

### 3.2 Add connection points with `<Handle />`

- Import `Handle` and `Position` from `@xyflow/react`.
- For a **skill tree** (parent → children), a common pattern:
  - **One target handle** (top or left): where “parent” edges connect *in*.
  - **One source handle** (bottom or right): where edges connect *out* to children.
- Example:

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';

export function SkillNode({ data, selected }: NodeProps) {
  return (
    <div className={selected ? 'ring-2 ring-primary' : ''}>
      <Handle type="target" position={Position.Top} />
      {/* Your skill content: name, icon, progress, etc. */}
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

- If you have **multiple handles** (e.g. multiple children), give each an `id` and reference them in edges with `sourceHandle` / `targetHandle`.

### 3.3 Register your node type

- Define a **nodeTypes** object (outside the component or in a stable reference to avoid unnecessary re-renders):

```ts
const nodeTypes = { skill: SkillNode };
```

- Pass it to `<ReactFlow />`:

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  fitView
/>
```

- For each node that should use this UI, set `type: 'skill'` (and put skill-specific fields in `data`, e.g. `label`, `unlocked`, `progress`).

---

## 4. Data Model: Nodes and Edges

- **Nodes:** Each skill = one node.  
  - Required: `id`, `position`, `data`.  
  - Use `type: 'skill'` (or whatever key you used in `nodeTypes`).  
  - Put everything the node needs to render in `data` (e.g. `label`, `description`, `unlocked`, `progress`).
- **Edges:** Parent → child.  
  - Required: `id`, `source`, `target`.  
  - Optionally `sourceHandle` / `targetHandle` if you use multiple handles per node.

You can derive `nodes` and `edges` from your own **skill tree data structure** (e.g. recursive tree) by:
- One pass to build nodes (with positions if you compute layout yourself).
- One pass to build edges from parent–child links.

---

## 5. Tree Layout (Optional but Recommended)

React Flow does **not** auto-arrange nodes; you give it `position: { x, y }`. For a tree:

- **Option A – Dagre (recommended in docs for trees):**  
  Use `@dagrejs/dagre` to compute positions from your graph, then set each node’s `position` and pass the result to React Flow. See [Layout – Dagre](https://reactflow.dev/examples/layout/dagre).
- **Option B – Your own layout:**  
  Walk your tree and assign `(x, y)` (e.g. by depth and index).
- **Option C – D3-hierarchy / ELK / etc.:**  
  See [Layouting overview](https://reactflow.dev/learn/layouting/layouting).

Your **tree wrapper** can run layout when data or view changes and then set `nodes` with updated positions.

---

## 6. Next.js–Specific: Client-Only and SSR

React Flow relies on the DOM and is **client-only**. In the App Router:

- Put the **tree wrapper** (the one that renders `<ReactFlow />`) in a **Client Component**: add `'use client'` at the top of that file.
- Import the style in that client component (or in a layout that only affects client):  
  `import '@xyflow/react/dist/style.css'`
- If you want to avoid pulling React Flow into the server bundle, you can **dynamically import** the tree wrapper with `ssr: false`:

```tsx
import dynamic from 'next/dynamic';

const SkillTreeFlow = dynamic(() => import('@/components/SkillTreeFlow'), {
  ssr: false,
});
```

Then use `<SkillTreeFlow />` in your page. The rest of the page can stay server-rendered.

---

## 7. Checklist Summary

| Step | Action |
|------|--------|
| 1 | `npm install @xyflow/react` |
| 2 | Create a **SkillTreeFlow** (or similar) wrapper: state for nodes/edges, `nodeTypes`, pass props into `<ReactFlow />`, add `<Background />` / `<Controls />` as needed. Ensure parent has width/height. |
| 3 | Create **SkillNode** (or similar): render from `NodeProps`, add `<Handle type="target" />` and `<Handle type="source" />`. Put skill UI in `data`. |
| 4 | Define **nodeTypes** = `{ skill: SkillNode }` and pass to ReactFlow; set each node’s `type: 'skill'`. |
| 5 | Build **nodes** and **edges** from your skill tree data; optionally run **Dagre** (or custom layout) to set `position` on nodes. |
| 6 | Use **Client Component** (`'use client'`) for the tree; optionally **dynamic import** with `ssr: false`. Import `@xyflow/react/dist/style.css` in the client bundle. |
| 7 | Optionally: **custom edges** (`edgeTypes`), **isValidConnection** to enforce tree rules (e.g. no cycles), and **fitView** / **nodeOrigin** for centering. |

---

## 8. Useful Docs and Examples

- [Quick Start](https://reactflow.dev/learn) — install and minimal flow.
- [Building a Flow](https://reactflow.dev/learn/concepts/building-a-flow) — nodes, edges, basic props.
- [Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) — your own node component and `nodeTypes`.
- [Handles](https://reactflow.dev/learn/customization/handles) — connection points and multiple handles.
- [Layouting (Dagre)](https://reactflow.dev/learn/layouting/layouting) — tree layout; [Dagre example](https://reactflow.dev/examples/layout/dagre).
- [Mind Map tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) — similar idea (custom nodes, state, tree-like UI).
- [SSR](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration) — if you ever need static/OG image generation (node dimensions, handle positions).

Once you have the wrapper and `SkillNode` in place, you can drive the whole tree from your existing skill data and optionally add layout, validation, and custom edges as needed.
