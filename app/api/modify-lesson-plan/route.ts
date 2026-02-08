import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { lessonPlanSchema } from "@/lib/lesson-plan-schema";
import type { LessonPlan } from "@/types/lesson-plan";

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentPlan, modificationRequest, planId } = body as {
      currentPlan: LessonPlan;
      modificationRequest: string;
      planId?: string;
    };

    console.log("[modify-api] received request, planId:", planId);
    console.log("[modify-api] modificationRequest:", modificationRequest);
    console.log("[modify-api] currentPlan title:", currentPlan?.title, "lessons:", currentPlan?.lessons?.length);

    if (!currentPlan || !modificationRequest) {
      console.log("[modify-api] missing fields, returning 400");
      return NextResponse.json(
        { error: "Missing required fields: currentPlan, modificationRequest" },
        { status: 400 }
      );
    }

    const userPrompt = `Here is the current lesson plan:\n\n${JSON.stringify(currentPlan, null, 2)}\n\nPlease modify this lesson plan according to the following request:\n${modificationRequest}\n\nPreserve lesson numbers where possible so that completion tracking is maintained. Only change what is necessary to fulfill the modification request.`;

    console.log("[modify-api] calling Claude API...");
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      tools: [lessonPlanSchema],
      tools: [lessonPlanSchema()],
      tool_choice: { type: "tool", name: "generate_lesson_plan" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use"
    );

    console.log("[modify-api] Claude response received, content blocks:", response.content.map(b => b.type));

    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      console.log("[modify-api] no tool_use block found, returning 502");
      return NextResponse.json(
        { error: "No structured output returned from Claude" },
        { status: 502 }
      );
    }

    const modifiedPlan = toolUseBlock.input as LessonPlan;
    console.log("[modify-api] modified plan title:", modifiedPlan.title);
    console.log("[modify-api] modified plan lessons:", modifiedPlan.lessons.map(l => `${l.lesson_number}: ${l.topic}`));

    // Persist to DB if authenticated + planId exists
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[modify-api] authenticated user:", user?.id ?? "none", "planId:", planId);

    let lessonDbIds: Record<number, string> = {};

    if (user && planId) {
      // Update the lesson plan row
      const { error: planUpdateError } = await supabase
        .from("lesson_plans")
        .update({
          title: modifiedPlan.title,
          skill: modifiedPlan.skill,
          estimated_minutes: modifiedPlan.estimated_minutes,
          objectives: modifiedPlan.objectives,
          raw_plan: modifiedPlan,
        })
        .eq("id", planId);

      if (planUpdateError) {
        console.error("[modify-api] lesson_plans update failed:", planUpdateError);
        return NextResponse.json(
          { error: "Failed to update lesson plan in database" },
          { status: 500 }
        );
      }

      // Fetch existing lessons to match by lesson_number + topic
      const { data: existingLessons, error: fetchLessonsError } = await supabase
        .from("lessons")
        .select("id, lesson_number, topic")
        .eq("lesson_plan_id", planId);
      console.log("[modify-api] fetch existing lessons:", fetchLessonsError ? `ERROR: ${fetchLessonsError.message}` : `found ${existingLessons?.length ?? 0}`);

      const existingMap = new Map(
        (existingLessons ?? []).map((l) => [`${l.lesson_number}:${l.topic}`, l])
      );

      const newLessonKeys = new Set(
        modifiedPlan.lessons.map((l) => `${l.lesson_number}:${l.topic}`)
      );

      // Delete removed lessons (cascade deletes completions)
      const toDelete = (existingLessons ?? []).filter(
        (l) => !newLessonKeys.has(`${l.lesson_number}:${l.topic}`)
      );
      console.log("[modify-api] lessons to delete:", toDelete.length, toDelete.map(l => `${l.lesson_number}:${l.topic}`));
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("lessons")
          .delete()
          .in("id", toDelete.map((l) => l.id));
        if (deleteError) {
          console.error("[modify-api] lessons delete failed:", deleteError);
        }
        console.log("[modify-api] delete lessons:", deleteError ? `ERROR: ${deleteError.message}` : "OK");
      }

      // Upsert lessons: update matched, insert new
      for (const lesson of modifiedPlan.lessons) {
        const key = `${lesson.lesson_number}:${lesson.topic}`;
        const existing = existingMap.get(key);

        if (existing) {
          // Update in-place (preserves UUID → completion survives)
          const { error: lessonUpdateError } = await supabase
            .from("lessons")
            .update({
              layer: lesson.layer,
              difficulty: lesson.difficulty,
              description: lesson.description,
              resources: lesson.resources,
              duration_minutes: lesson.duration_minutes,
              connections: lesson.connections,
            })
            .eq("id", existing.id);
          if (lessonUpdateError) {
            console.error("[modify-api] lesson update failed:", lessonUpdateError);
          }
          lessonDbIds[lesson.lesson_number] = existing.id;
        } else {
          // Insert new
          const { data: newRow, error: insertError } = await supabase
            .from("lessons")
            .insert({
              lesson_plan_id: planId,
              lesson_number: lesson.lesson_number,
              layer: lesson.layer,
              topic: lesson.topic,
              difficulty: lesson.difficulty,
              description: lesson.description,
              resources: lesson.resources,
              duration_minutes: lesson.duration_minutes,
              connections: lesson.connections,
            })
            .select("id")
            .single();
          console.log(`[modify-api] insert lesson ${lesson.lesson_number} (${lesson.topic}):`, insertError ? `ERROR: ${insertError.message}` : `OK, id=${newRow?.id}`);
          if (newRow) {
            lessonDbIds[lesson.lesson_number] = newRow.id;
          }
        }
      }

      // Upsert layers (RLS may block DELETE, so upsert is safer)
      const { error: upsertLayersError } = await supabase.from("layers").upsert(
        modifiedPlan.layers.map((l) => ({
          lesson_plan_id: planId,
          layer_number: l.layer_number,
          theme: l.theme,
        })),
        { onConflict: "lesson_plan_id,layer_number" }
      );
      console.log("[modify-api] upsert layers:", upsertLayersError ? `ERROR: ${upsertLayersError.message}` : "OK");

      // Remove layers no longer in the plan
      const newLayerNumbers = modifiedPlan.layers.map((l) => l.layer_number);
      const { error: deleteStaleLayersError } = await supabase
        .from("layers")
        .delete()
        .eq("lesson_plan_id", planId)
        .not("layer_number", "in", `(${newLayerNumbers.join(",")})`);
      console.log("[modify-api] delete stale layers:", deleteStaleLayersError ? `ERROR: ${deleteStaleLayersError.message}` : "OK (may be 0 rows)");

      // Fetch completions for the surviving lessons
      const lessonIds = Object.values(lessonDbIds);
      const { data: completionRows } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .in("lesson_id", lessonIds);

      const completedLessonIds = new Set(
        (completionRows ?? []).map((c) => c.lesson_id)
      );

      const completions: Record<number, boolean> = {};
      for (const [lessonNum, dbId] of Object.entries(lessonDbIds)) {
        completions[Number(lessonNum)] = completedLessonIds.has(dbId);
      }

      return NextResponse.json({
        ...modifiedPlan,
        lesson_plan_id: planId,
        lesson_db_ids: lessonDbIds,
        completions,
      });
    }

    // Unauthenticated or no planId — return plan only
    console.log("[modify-api] no auth or no planId, returning plan without DB persistence");
    return NextResponse.json(modifiedPlan);
  } catch (error) {
    console.error("Error modifying lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to modify lesson plan" },
      { status: 500 }
    );
  }
}
