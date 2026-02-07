import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { ButtonProps } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

interface AIPanelArrowProps extends ButtonProps {
  // Add any custom props here
}

export function AIPanelArrow({
  children,
  className,
  ...props
}: AIPanelArrowProps) {
  return (
    <Button className={`cursor-pointer ${className}`} {...props}>
      <ChevronUp className="h-4 w-4" />
      {children}
    </Button>
  );
}
