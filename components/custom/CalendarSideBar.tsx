"use client";

import { useState, useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Calendar } from "@/components/ui/calendar";
import { useCalendar } from "@/components/CalendarContext";
import { computeSchedule, type ScheduledLesson } from "@/lib/schedule";

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendarSideBar() {
  const [date, setDate] = useState<Date>(new Date());
  const { lessons, dailyCommitmentMinutes } = useCalendar();

  const { scheduleMap } = useMemo(
    () =>
      lessons.length > 0
        ? computeSchedule(lessons, dailyCommitmentMinutes)
        : { scheduledLessons: [], scheduleMap: new Map<string, ScheduledLesson[]>() },
    [lessons, dailyCommitmentMinutes]
  );

  // Collect all scheduled dates for calendar highlighting
  const scheduledDates = useMemo(() => {
    const dates: Date[] = [];
    for (const key of scheduleMap.keys()) {
      const [y, m, d] = key.split("-").map(Number);
      dates.push(new Date(y, m - 1, d));
    }
    return dates;
  }, [scheduleMap]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const selectedDayLessons = scheduleMap.get(dateKey(date)) ?? [];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Calendar</SidebarGroupLabel>
          <SidebarGroupContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              modifiers={{ scheduled: scheduledDates }}
              modifiersClassNames={{ scheduled: "bg-emerald-200 text-emerald-900 font-semibold" }}
            />
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Selected: {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            {lessons.length > 0 ? "Lessons for this day" : "Schedule"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {lessons.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Generate a plan to see your schedule.
              </p>
            ) : selectedDayLessons.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No lessons scheduled for this day.
              </p>
            ) : (
              <ul className="space-y-2 px-3 py-2">
                {selectedDayLessons.map((sl) => (
                  <li key={sl.lessonNumber} className="rounded-md border p-2">
                    <p className="text-sm font-medium">
                      Lesson {sl.lessonNumber}: {sl.topic}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sl.daySpan === 1
                        ? "1 day"
                        : `${sl.daySpan} days (${sl.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sl.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
