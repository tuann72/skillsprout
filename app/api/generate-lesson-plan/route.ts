import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const VALID_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
type Level = (typeof VALID_LEVELS)[number];

const client = new Anthropic();

const lessonPlanSchema: Anthropic.Tool = {
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
    " FOR NOW RETURN EXACTLY 15 LESSONS spread across 4 layers." +
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skill, currentLevel, goalLevel, duration, dailyCommitment } = body;

    if (
      !skill ||
      !currentLevel ||
      !goalLevel ||
      !duration ||
      !dailyCommitment
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: skill, currentLevel, goalLevel, duration, dailyCommitment",
        },
        { status: 400 },
      );
    }

    if (
      !VALID_LEVELS.includes(currentLevel as Level) ||
      !VALID_LEVELS.includes(goalLevel as Level)
    ) {
      return NextResponse.json(
        {
          error: `Invalid level. Must be one of: ${VALID_LEVELS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const userPrompt = `I want to learn how to ${skill}. I am a ${currentLevel} player and want to get to ${goalLevel} level.
    I want this lesson plan to be completed in ${duration} with a daily commitment of ${dailyCommitment} minutes.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      tools: [lessonPlanSchema],
      tool_choice: { type: "tool", name: "generate_lesson_plan" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use",
    );

    if (toolUseBlock && toolUseBlock.type === "tool_use") {
      return NextResponse.json(toolUseBlock.input);
    }

    return NextResponse.json(
      { error: "No structured output returned from Claude" },
      { status: 502 },
    );
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson plan" },
      { status: 500 },
    );
  }
}
