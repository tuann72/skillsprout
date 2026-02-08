import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

type HomeButtonProps = {
  onClick?: () => void;
};

export function HomeButton({ onClick }: HomeButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="cursor-pointer bg-white hover:bg-zinc-100"
      onClick={onClick}
    >
      <Home className="h-4 w-4" />
    </Button>
  );
}
