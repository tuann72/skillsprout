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
  const { lesson_id } = body;

  if (!lesson_id) {
    return NextResponse.json(
      { error: "Missing lesson_id" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("lesson_completions").upsert(
    { user_id: user.id, lesson_id },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { lesson_id } = body;

  if (!lesson_id) {
    return NextResponse.json(
      { error: "Missing lesson_id" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("lesson_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("lesson_id", lesson_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
