import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";

export function NewDraftButton() {
  return (
    <Button className="cursor-pointer">
      <FilePlus className="h-4 w-4" />
    </Button>
  );
}
