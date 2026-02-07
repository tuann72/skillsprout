import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";

type NewDraftButtonProps = {
  onClick?: () => void;
};

export function NewDraftButton({ onClick }: NewDraftButtonProps) {
  return (
    <Button className="cursor-pointer" onClick={onClick}>
      <FilePlus className="h-4 w-4" />
    </Button>
  );
}
