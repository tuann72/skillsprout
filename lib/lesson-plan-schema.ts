import type Anthropic from "@anthropic-ai/sdk";

export const lessonPlanSchema: Anthropic.Tool = {
  name: "generate_lesson_plan",
  description:
    "Generate a structured lesson plan organized into LAYERS." +
    " Each layer represents a learning phase with a cohesive theme (e.g. 'Foundations', 'Core Techniques', 'Applied Practice')." +
    " IMPORTANT RULES:" +
    " 1. Every layer should contain 2-4 PARALLEL lessons that can be studied independently within that phase." +
    " 2. Keep connections SPARSE — each lesson should connect to at most 1 parent from the layer directly above. Many lessons in a layer may share the same single parent, or each connect to a different one. Avoid connecting a lesson to multiple parents." +
    " 3. Layer 0 is the starting point and should have 1-2 foundational lessons with NO connections." +
    " 4. Lessons within the same layer do NOT connect to each other — they are parallel paths." +
    " 5. Difficulty should generally increase across layers, not within a layer." +
    " 6. Each lesson needs unique, publicly accessible online resources (articles, videos, exercises as URLs). DO NOT REPEAT RESOURCES." +
    " 7. Take into account the user's daily time commitment when sizing lesson durations." +
    " FOR NOW RETURN EXACTLY 3 LESSONS spread across 3 layers." +
    " Return the result using this tool.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "Title of the overall lesson plan",
      },
      skill: {
        type: "string",
        description: "The skill being taught",
      },
      estimated_minutes: {
        type: "number",
        description: "Estimated total time to complete in minutes",
      },
      objectives: {
        type: "array",
        items: { type: "string" },
        description: "Learning objectives for the full plan",
      },
      layers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            layer_number: {
              type: "number",
              description: "Zero-based layer index (0 is the first/root layer)",
            },
            theme: {
              type: "string",
              description:
                "A short, descriptive theme for this layer (e.g. 'Foundations', 'Core Techniques', 'Real-World Application')",
            },
          },
          required: ["layer_number", "theme"],
        },
        description:
          "Ordered list of layers. Each layer groups parallel lessons under a cohesive theme.",
      },
      lessons: {
        type: "array",
        items: {
          type: "object",
          properties: {
            lesson_number: { type: "number" },
            layer: {
              type: "number",
              description:
                "Which layer this lesson belongs to (must match a layer_number in the layers array). " +
                "Layer 0 lessons have no connections. Layer N lessons connect to lesson(s) in layer N-1.",
            },
            topic: { type: "string" },
            difficulty: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced", "expert"],
              description: "Difficulty level of this lesson",
            },
            description: { type: "string" },
            resources: {
              type: "array",
              items: { type: "string" },
              description:
                "Unique resources for this specific lesson — articles, videos, exercises as URLs. " +
                "Must be publicly accessible. DO NOT reuse resources from other lessons.",
            },
            duration_minutes: { type: "number" },
            connections: {
              type: "array",
              items: { type: "number" },
              description:
                "Lesson numbers from the layer directly above that are prerequisites. " +
                "Keep this SPARSE — ideally 0 (for layer 0) or 1 parent. Max 2.",
            },
          },
          required: [
            "lesson_number",
            "layer",
            "topic",
            "difficulty",
            "description",
            "resources",
            "duration_minutes",
            "connections",
          ],
        },
        description:
          "All lessons in the plan. Each lesson belongs to exactly one layer.",
      },
    },
    required: [
      "title",
      "skill",
      "estimated_minutes",
      "objectives",
      "layers",
      "lessons",
    ],
  },
};
