/** Matches the JSON schema returned by the LLM (generate_lesson_plan tool). */

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export type Lesson = {
  lesson_number: number;
  topic: string;
  difficulty: Difficulty;
  description: string;
  resources: string[];
  duration_minutes: number;
  /** Lesson numbers that are prerequisites for this lesson. */
  connections: number[];
};

export type LessonPlan = {
  title: string;
  skill: string;
  estimated_minutes: number;
  objectives: string[];
  lessons: Lesson[];
};
