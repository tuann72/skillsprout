import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LessonPlan } from "@/types/lesson-plan";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const plans: LessonPlan[] = Array.isArray(body) ? body : [body];
  const results: { id: string; title: string }[] = [];

  for (const plan of plans) {
    if (!plan.title || !plan.skill || !plan.layers || !plan.lessons) {
      return NextResponse.json(
        { error: `Invalid plan format: missing required fields` },
        { status: 400 }
      );
    }

    const { data: planRow, error: planError } = await supabase
      .from("lesson_plans")
      .insert({
        user_id: user.id,
        title: plan.title,
        skill: plan.skill,
        estimated_minutes: plan.estimated_minutes,
        objectives: plan.objectives,
        current_level: "imported",
        goal_level: "imported",
        duration: "imported",
        daily_commitment: "imported",
        raw_plan: plan,
      })
      .select("id")
      .single();

    if (planError || !planRow) {
      return NextResponse.json(
        { error: "Failed to save plan" },
        { status: 500 }
      );
    }

    await supabase.from("layers").insert(
      plan.layers.map((l) => ({
        lesson_plan_id: planRow.id,
        layer_number: l.layer_number,
        theme: l.theme,
      }))
    );

    await supabase.from("lessons").insert(
      plan.lessons.map((l) => ({
        lesson_plan_id: planRow.id,
        lesson_number: l.lesson_number,
        layer: l.layer,
        topic: l.topic,
        difficulty: l.difficulty,
        description: l.description,
        resources: l.resources,
        duration_minutes: l.duration_minutes,
        connections: l.connections,
      }))
    );

    results.push({ id: planRow.id, title: plan.title });
  }

  return NextResponse.json({ imported: results });
}
