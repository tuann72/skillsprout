import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

  // Fetch the plan
  const { data: plan, error: planError } = await supabase
    .from("lesson_plans")
    .select("*")
    .eq("id", id)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Fetch lessons
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("lesson_plan_id", id)
    .order("lesson_number");

  // Fetch layers
  const { data: layers } = await supabase
    .from("layers")
    .select("*")
    .eq("lesson_plan_id", id)
    .order("layer_number");

  // Fetch completions for this user and plan's lessons
  const lessonIds = (lessons ?? []).map((l) => l.id);
  let completions: Record<number, boolean> = {};
  let lessonDbIds: Record<number, string> = {};

  if (lessonIds.length > 0) {
    const { data: completionRows } = await supabase
      .from("lesson_completions")
      .select("lesson_id")
      .eq("user_id", user.id)
      .in("lesson_id", lessonIds);

    const completedSet = new Set(
      (completionRows ?? []).map((c) => c.lesson_id)
    );

    for (const lesson of lessons ?? []) {
      completions[lesson.lesson_number] = completedSet.has(lesson.id);
      lessonDbIds[lesson.lesson_number] = lesson.id;
    }
  }

  return NextResponse.json({
    title: plan.title,
    skill: plan.skill,
    estimated_minutes: plan.estimated_minutes,
    objectives: plan.objectives,
    layers: (layers ?? []).map((l) => ({
      layer_number: l.layer_number,
      theme: l.theme,
    })),
    lessons: (lessons ?? []).map((l) => ({
      lesson_number: l.lesson_number,
      layer: l.layer,
      topic: l.topic,
      difficulty: l.difficulty,
      description: l.description,
      resources: l.resources,
      duration_minutes: l.duration_minutes,
      connections: l.connections,
    })),
    lesson_plan_id: plan.id,
    lesson_db_ids: lessonDbIds,
    completions,
  });
}
