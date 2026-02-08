"use client";

import { SavedPlans } from "@/components/SavedPlans";
import { useRouter } from "next/navigation";

export default function SavedLessonsPage() {
  const router = useRouter();

  const handlePlanSelect = (planId: string) => {
    // Navigate to the skill tree for this plan
    router.push(`/?planId=${planId}`);
  };

  const handleGenerateNew = () => {
    // Navigate to home to create a new lesson plan
    router.push("/");
  };

  return (
    <div className="w-full">
      <SavedPlans onSelect={handlePlanSelect} onGenerateNew={handleGenerateNew} />
    </div>
  );
}
