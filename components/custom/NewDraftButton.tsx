import { Button } from "@/components/ui/button";
import { ButtonProps } from "@/components/ui/button";
import { FilePlus } from "lucide-react";

interface NewDraftButtonProps extends ButtonProps {
  // Add any custom props here
}

export function NewDraftButton({
  children,
  className,
  ...props
}: NewDraftButtonProps) {
  return (
    <Button className={`cursor-pointer ${className}`} {...props}>
      <FilePlus className="h-4 w-4" />
      {children}
    </Button>
  );
}
