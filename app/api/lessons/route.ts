import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { plan_id, topic, description, difficulty, duration_minutes, resources, layer, connections } = body;

  if (!plan_id || !topic) {
    return NextResponse.json({ error: "Missing plan_id or topic" }, { status: 400 });
  }

  // Get the current max lesson_number for this plan
  const { data: existingLessons } = await supabase
    .from("lessons")
    .select("lesson_number")
    .eq("lesson_plan_id", plan_id)
    .order("lesson_number", { ascending: false })
    .limit(1);

  const nextLessonNumber = (existingLessons?.[0]?.lesson_number ?? 0) + 1;

  // Insert the new lesson
  const { data: newLesson, error: insertError } = await supabase
    .from("lessons")
    .insert({
      lesson_plan_id: plan_id,
      lesson_number: nextLessonNumber,
      layer: layer ?? 0,
      topic,
      description: description ?? "",
      difficulty: difficulty ?? "beginner",
      duration_minutes: duration_minutes ?? 30,
      resources: resources ?? [],
      connections: connections ?? [],
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update raw_plan jsonb to include the new lesson
  const { data: plan } = await supabase
    .from("lesson_plans")
    .select("raw_plan")
    .eq("id", plan_id)
    .single();

  if (plan?.raw_plan) {
    const rawPlan = plan.raw_plan as { lessons: Array<Record<string, unknown>> };
    rawPlan.lessons.push({
      lesson_number: nextLessonNumber,
      layer: layer ?? 0,
      topic,
      description: description ?? "",
      difficulty: difficulty ?? "beginner",
      duration_minutes: duration_minutes ?? 30,
      resources: resources ?? [],
      connections: connections ?? [],
    });

    await supabase
      .from("lesson_plans")
      .update({ raw_plan: rawPlan })
      .eq("id", plan_id);
  }

  return NextResponse.json({
    success: true,
    lesson_number: nextLessonNumber,
    lesson_id: newLesson.id,
  });
}
