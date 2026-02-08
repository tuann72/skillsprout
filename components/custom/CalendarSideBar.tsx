"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface CalendarSideBarProps {
  onDateSelect?: (date: Date) => void;
}

export function CalendarSideBar({ onDateSelect }: CalendarSideBarProps) {
  const [date, setDate] = useState<Date>(new Date());
  const router = useRouter();


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

        <SidebarGroup>
          <SidebarGroupContent>
            <Button
              onClick={() => router.push("/saved-lessons")}
              variant="outline"
              className="w-full"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              View Saved Lessons
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
