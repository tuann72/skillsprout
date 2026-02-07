import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";

export function NewDraftButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button className={`cursor-pointer ${className}`} {...props}>
      <FilePlus className="h-4 w-4" />
      {children}
    </Button>
  );
}
