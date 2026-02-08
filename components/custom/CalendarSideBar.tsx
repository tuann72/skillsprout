"use client";

import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Calendar } from "@/components/ui/calendar";

interface CalendarSideBarProps {
  onDateSelect?: (date: Date) => void;
}

export function CalendarSideBar({ onDateSelect }: CalendarSideBarProps) {
  const [date, setDate] = useState<Date>(new Date());

  // Notify parent of initial date on mount
  useEffect(() => {
    onDateSelect?.(date);
  }, []);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      onDateSelect?.(selectedDate);
    }
  };

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
            />
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Selected: {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
