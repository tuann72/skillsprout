import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { lessonPlanSchema } from "@/lib/lesson-plan-schema";
import type { LessonPlan } from "@/types/lesson-plan";

const VALID_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;
type Level = (typeof VALID_LEVELS)[number];

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skill, currentLevel, goalLevel, duration, dailyCommitment, lessonCount } = body;

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
      max_tokens: 8192,
      tools: [lessonPlanSchema(lessonCount ? parseInt(lessonCount, 10) : 10)],
      tool_choice: { type: "tool", name: "generate_lesson_plan" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use"
    );

    if (toolUseBlock && toolUseBlock.type === "tool_use") {
      const plan = toolUseBlock.input as LessonPlan;

      // Save to Supabase if user is authenticated
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let lessonPlanId: string | null = null;
      let lessonDbIds: Record<number, string> = {};

      if (user) {
        const { data: planRow } = await supabase
          .from("lesson_plans")
          .insert({
            user_id: user.id,
            title: plan.title,
            skill: plan.skill,
            estimated_minutes: plan.estimated_minutes,
            objectives: plan.objectives,
            current_level: body.currentLevel,
            goal_level: body.goalLevel,
            duration: body.duration,
            daily_commitment: body.dailyCommitment,
            raw_plan: plan,
          })
          .select("id")
          .single();

        if (planRow) {
          lessonPlanId = planRow.id;

          // Insert layers
          await supabase.from("layers").insert(
            plan.layers.map((l) => ({
              lesson_plan_id: lessonPlanId!,
              layer_number: l.layer_number,
              theme: l.theme,
            }))
          );

          // Insert lessons and collect their DB IDs
          const { data: lessonRows } = await supabase
            .from("lessons")
            .insert(
              plan.lessons.map((l) => ({
                lesson_plan_id: lessonPlanId!,
                lesson_number: l.lesson_number,
                layer: l.layer,
                topic: l.topic,
                difficulty: l.difficulty,
                description: l.description,
                resources: l.resources,
                duration_minutes: l.duration_minutes,
                connections: l.connections,
              }))
            )
            .select("id, lesson_number");

          if (lessonRows) {
            lessonDbIds = Object.fromEntries(
              lessonRows.map((r) => [r.lesson_number, r.id])
            );
          }
        }
      }

      return NextResponse.json({
        ...plan,
        lesson_plan_id: lessonPlanId,
        lesson_db_ids: lessonDbIds,
      });
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
