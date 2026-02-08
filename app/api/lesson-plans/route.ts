import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: plans, error } = await supabase
    .from("lesson_plans")
    .select("id, title, skill, estimated_minutes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For each plan, get lesson count and completion count
  const plansWithProgress = await Promise.all(
    (plans ?? []).map(async (plan) => {
      const { count: lessonCount } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("lesson_plan_id", plan.id);

      const { data: lessonIds } = await supabase
        .from("lessons")
        .select("id")
        .eq("lesson_plan_id", plan.id);

      let completedCount = 0;
      if (lessonIds && lessonIds.length > 0) {
        const { count } = await supabase
          .from("lesson_completions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in(
            "lesson_id",
            lessonIds.map((l) => l.id)
          );
        completedCount = count ?? 0;
      }

      return {
        ...plan,
        lesson_count: lessonCount ?? 0,
        completed_count: completedCount,
      };
    })
  );

  return NextResponse.json({ plans: plansWithProgress });
}
