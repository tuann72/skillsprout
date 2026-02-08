import type { Lesson } from "@/types/lesson-plan";

export type ScheduledLesson = {
  lessonNumber: number;
  topic: string;
  startDate: Date;
  endDate: Date;
  daySpan: number;
};

export type ScheduleResult = {
  scheduledLessons: ScheduledLesson[];
  scheduleMap: Map<string, ScheduledLesson[]>;
};

/** Format a date as "YYYY-MM-DD" using local time. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add `days` calendar days to a date (returns new Date). */
function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Compute a schedule for a set of lessons.
 *
 * Uses topological sort (Kahn's algorithm) respecting `connections` (prerequisites).
 * Lessons within the same layer are scheduled sequentially (one after another).
 * Each lesson's daySpan = ceil(duration_minutes / dailyCommitmentMinutes), minimum 1.
 */
export function computeSchedule(
  lessons: Lesson[],
  dailyCommitmentMinutes: number,
  startDate: Date = new Date()
): ScheduleResult {
  const commitment = Math.max(1, dailyCommitmentMinutes);

  if (lessons.length === 0) {
    return { scheduledLessons: [], scheduleMap: new Map() };
  }

  // Build adjacency: prerequisite → dependents
  const byNumber = new Map(lessons.map((l) => [l.lesson_number, l]));
  const inDegree = new Map<number, number>();
  const dependents = new Map<number, number[]>();

  for (const lesson of lessons) {
    inDegree.set(lesson.lesson_number, lesson.connections.length);
    for (const prereq of lesson.connections) {
      const list = dependents.get(prereq) ?? [];
      list.push(lesson.lesson_number);
      dependents.set(prereq, list);
    }
  }

  // Kahn's algorithm — topological order, within same layer sort by lesson_number
  const queue: number[] = [];
  for (const lesson of lessons) {
    if (lesson.connections.length === 0) {
      queue.push(lesson.lesson_number);
    }
  }
  queue.sort((a, b) => a - b);

  const sorted: Lesson[] = [];
  while (queue.length > 0) {
    // Pick the lesson with smallest layer first, then smallest lesson_number
    queue.sort((a, b) => {
      const la = byNumber.get(a)!;
      const lb = byNumber.get(b)!;
      if (la.layer !== lb.layer) return la.layer - lb.layer;
      return a - b;
    });

    const num = queue.shift()!;
    sorted.push(byNumber.get(num)!);

    for (const dep of dependents.get(num) ?? []) {
      const newDeg = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) {
        queue.push(dep);
      }
    }
  }

  // Schedule sequentially
  const scheduledLessons: ScheduledLesson[] = [];
  const endDates = new Map<number, Date>(); // lesson_number → end date

  // Start from the beginning of startDate (strip time)
  const baseStart = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );

  let nextAvailable = baseStart;

  for (const lesson of sorted) {
    // The lesson can start after all prerequisites finish AND after the previous lesson finishes
    let lessonStart = nextAvailable;
    for (const prereq of lesson.connections) {
      const prereqEnd = endDates.get(prereq);
      if (prereqEnd && prereqEnd > lessonStart) {
        lessonStart = prereqEnd;
      }
    }

    const daySpan = Math.max(1, Math.ceil(lesson.duration_minutes / commitment));
    const lessonEnd = addDays(lessonStart, daySpan);

    scheduledLessons.push({
      lessonNumber: lesson.lesson_number,
      topic: lesson.topic,
      startDate: lessonStart,
      endDate: addDays(lessonStart, daySpan - 1), // inclusive end
      daySpan,
    });

    endDates.set(lesson.lesson_number, lessonEnd);
    nextAvailable = lessonEnd;
  }

  // Build schedule map: date string → lessons active that day
  const scheduleMap = new Map<string, ScheduledLesson[]>();
  for (const sl of scheduledLessons) {
    let current = new Date(sl.startDate);
    const end = sl.endDate;
    while (current <= end) {
      const key = dateKey(current);
      const list = scheduleMap.get(key) ?? [];
      list.push(sl);
      scheduleMap.set(key, list);
      current = addDays(current, 1);
    }
  }

  return { scheduledLessons, scheduleMap };
}
