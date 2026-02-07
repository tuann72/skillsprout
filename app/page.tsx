import Image from "next/image";
import { AIPanelArrow } from "@/components/custom/AI-panel-arrow";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <AIPanelArrow className="absolute bottom-4" />
    </div>
  );
}
