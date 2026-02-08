"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Lesson } from "@/types/lesson-plan";

interface CalendarContextValue {
  lessons: Lesson[];
  dailyCommitmentMinutes: number;
  setLessons: (lessons: Lesson[]) => void;
  setDailyCommitmentMinutes: (minutes: number) => void;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [dailyCommitmentMinutes, setDailyCommitmentMinutes] = useState(30);

  return (
    <CalendarContext.Provider
      value={{ lessons, dailyCommitmentMinutes, setLessons, setDailyCommitmentMinutes }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendar must be used within CalendarProvider");
  return ctx;
}
