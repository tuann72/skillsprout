/** Matches the JSON schema returned by the LLM (generate_lesson_plan tool). */

export type Difficulty = "beginner" | "intermediate" | "advanced" | "expert";

export type Layer = {
  layer_number: number;
  /** Short descriptive theme for the layer (e.g. "Foundations", "Core Techniques"). */
  theme: string;
};

export type Lesson = {
  lesson_number: number;
  /** The layer (depth) this lesson belongs to. 0 = root. */
  layer: number;
  topic: string;
  difficulty: Difficulty;
  description: string;
  resources: string[];
  duration_minutes: number;
  /** Lesson numbers that are prerequisites for this lesson (from the layer above). */
  connections: number[];
};

export type LessonPlan = {
  title: string;
  skill: string;
  estimated_minutes: number;
  objectives: string[];
  layers: Layer[];
  lessons: Lesson[];
};
