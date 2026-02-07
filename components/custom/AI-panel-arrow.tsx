import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

export function AIPanelArrow() {
  return (
    <Button className="cursor-pointer">
      <ChevronUp className="h-4 w-4" />
    </Button>
  );
}
