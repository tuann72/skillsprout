import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const VALID_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
type Level = (typeof VALID_LEVELS)[number];

const client = new Anthropic();

const lessonPlanSchema: Anthropic.Tool = {
  name: "generate_lesson_plan",
  description:
    " Generate a structured lesson plan for learning a new skill based on the user's current level and goal level." +
    " The lessons should increase" +
    " in complexity, going from beginner, intermediate, advanced, to expert. Provide enough" +
    " lessons to master the skill in the given duration. Take into account the daily commitment for each lesson. " +
    " Each lesson should have specific resources for the topic being taught in that lesson. " +
    " Make sure to provide a variety of resources such as articles, videos, and exercises as url links. Make sure these " +
    " resources are publicly accessible online. DO NOT REPEAT THE SAME RESOURCES FOR DIFFERENT LESSONS. " +
    " There can be branches down different paths of learning, so make sure to include connections between lessons." +
    " FOR NOW JUST RETURN 3 LESSONS IN THE PLAN" +
    " Return the result using this tool.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "Title of the lesson",
      },
      skill: {
        type: "string",
        description: "The skill being taught",
      },
      estimated_minutes: {
        type: "number",
        description: "Estimated time to complete in minutes",
      },
      objectives: {
        type: "array",
        items: { type: "string" },
        description: "Learning objectives",
      },
      lessons: {
        type: "array",
        items: {
          type: "object",
          properties: {
            lesson_number: { type: "number" },
            topic: { type: "string" },
            difficulty: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced", "expert"],
              description: "Difficulty level",
            },
            description: { type: "string" },
            resources: {
              type: "array",
              items: { type: "string" },
              description:
                "Resources for the lesson based on the specific topic. Provide " +
                "a mix of resources such as articles, videos, and exercises as url links. Make sure these " +
                "resources are publicly accessible online. DO NOT REPEAT THE SAME RESOURCES FOR DIFFERENT LESSONS. " +
                "each lesson should have its own unique set of resources.",
            },
            duration_minutes: { type: "number" },
            connections: {
              type: "array",
              items: { type: "number" },
              description:
                "List of lesson numbers that are prerequisites for this lesson",
            },
          },
          required: [
            "lesson_number",
            "topic",
            "difficulty",
            "description",
            "resources",
            "duration_minutes",
            "connections",
          ],
        },
        description: "Step-by-step lesson breakdown",
      },
    },
    required: ["title", "skill", "estimated_minutes", "objectives", "lessons"],
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skill, currentLevel, goalLevel, duration, dailyCommitment } = body;

    if (!skill || !currentLevel || !goalLevel || !duration || !dailyCommitment) {
      return NextResponse.json(
        { error: "Missing required fields: skill, currentLevel, goalLevel, duration, dailyCommitment" },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const userPrompt = `I want to learn how to ${skill}. I am a ${currentLevel} player and want to get to ${goalLevel} level.
    I want this lesson plan to be completed in ${duration} with a daily commitment of ${dailyCommitment} minutes.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 3072,
      tools: [lessonPlanSchema],
      tool_choice: { type: "tool", name: "generate_lesson_plan" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use"
    );

    if (toolUseBlock && toolUseBlock.type === "tool_use") {
      return NextResponse.json(toolUseBlock.input);
    }

    return NextResponse.json(
      { error: "No structured output returned from Claude" },
      { status: 502 }
    );
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson plan" },
      { status: 500 }
    );
  }
}
