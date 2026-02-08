-- =============================================
-- Add missing UPDATE and DELETE RLS policies
-- needed by the modify-lesson-plan endpoint
-- =============================================

-- Lesson Plans: allow UPDATE
create policy "Users can update own lesson plans"
  on public.lesson_plans for update using (auth.uid() = user_id);

-- Lessons: allow UPDATE and DELETE
create policy "Users can update lessons in own plans"
  on public.lessons for update using (
    exists (
      select 1 from public.lesson_plans
      where lesson_plans.id = lessons.lesson_plan_id
      and lesson_plans.user_id = auth.uid()
    )
  );

create policy "Users can delete lessons in own plans"
  on public.lessons for delete using (
    exists (
      select 1 from public.lesson_plans
      where lesson_plans.id = lessons.lesson_plan_id
      and lesson_plans.user_id = auth.uid()
    )
  );

-- Layers: allow DELETE
create policy "Users can delete layers in own plans"
  on public.layers for delete using (
    exists (
      select 1 from public.lesson_plans
      where lesson_plans.id = layers.lesson_plan_id
      and lesson_plans.user_id = auth.uid()
    )
  );
