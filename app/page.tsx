import { AIPanelArrow } from "@/components/custom/AI-panel-arrow";
import { NewDraftButton } from "@/components/custom/NewDraftButton";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <div className="fixed top-4 right-4">
        <NewDraftButton />
      </div>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
        <AIPanelArrow />
      </div>
    </div>
  );
}
