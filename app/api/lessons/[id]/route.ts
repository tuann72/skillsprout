import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { topic, description, difficulty, duration_minutes, resources } = body;

  // Fetch the lesson to get its plan_id and lesson_number
  const { data: lesson, error: fetchError } = await supabase
    .from("lessons")
    .select("lesson_plan_id, lesson_number")
    .eq("id", id)
    .single();

  if (fetchError || !lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Update the lesson row
  const updates: Record<string, unknown> = {};
  if (topic !== undefined) updates.topic = topic;
  if (description !== undefined) updates.description = description;
  if (difficulty !== undefined) updates.difficulty = difficulty;
  if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
  if (resources !== undefined) updates.resources = resources;

  const { error: updateError } = await supabase
    .from("lessons")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Update raw_plan jsonb in lesson_plans
  const { data: plan } = await supabase
    .from("lesson_plans")
    .select("raw_plan")
    .eq("id", lesson.lesson_plan_id)
    .single();

  if (plan?.raw_plan) {
    const rawPlan = plan.raw_plan as { lessons: Array<Record<string, unknown>> };
    const lessonIdx = rawPlan.lessons.findIndex(
      (l) => l.lesson_number === lesson.lesson_number
    );
    if (lessonIdx !== -1) {
      if (topic !== undefined) rawPlan.lessons[lessonIdx].topic = topic;
      if (description !== undefined) rawPlan.lessons[lessonIdx].description = description;
      if (difficulty !== undefined) rawPlan.lessons[lessonIdx].difficulty = difficulty;
      if (duration_minutes !== undefined) rawPlan.lessons[lessonIdx].duration_minutes = duration_minutes;
      if (resources !== undefined) rawPlan.lessons[lessonIdx].resources = resources;

      await supabase
        .from("lesson_plans")
        .update({ raw_plan: rawPlan })
        .eq("id", lesson.lesson_plan_id);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the lesson to get its plan_id and lesson_number
  const { data: lesson, error: fetchError } = await supabase
    .from("lessons")
    .select("lesson_plan_id, lesson_number")
    .eq("id", id)
    .single();

  if (fetchError || !lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Delete the lesson row (completions cascade via FK)
  const { error: deleteError } = await supabase
    .from("lessons")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Update raw_plan jsonb: remove lesson and its connections from other lessons
  const { data: plan } = await supabase
    .from("lesson_plans")
    .select("raw_plan")
    .eq("id", lesson.lesson_plan_id)
    .single();

  if (plan?.raw_plan) {
    const rawPlan = plan.raw_plan as {
      lessons: Array<{ lesson_number: number; connections: number[] }>;
    };

    // Remove the lesson from the array
    rawPlan.lessons = rawPlan.lessons.filter(
      (l) => l.lesson_number !== lesson.lesson_number
    );

    // Remove its lesson_number from other lessons' connections
    for (const l of rawPlan.lessons) {
      l.connections = l.connections.filter(
        (c) => c !== lesson.lesson_number
      );
    }

    await supabase
      .from("lesson_plans")
      .update({ raw_plan: rawPlan })
      .eq("id", lesson.lesson_plan_id);
  }

  return NextResponse.json({ success: true });
}
