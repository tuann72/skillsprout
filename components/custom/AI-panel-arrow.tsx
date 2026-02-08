"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";

interface AIPanelArrowProps {
  onModify?: (request: string) => Promise<void>;
}

export function AIPanelArrow({ onModify }: AIPanelArrowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    console.log("[AI-Panel] handleSubmit called, input:", input, "onModify:", !!onModify, "isLoading:", isLoading);
    if (!input.trim() || isLoading || !onModify) {
      console.log("[AI-Panel] early return — empty input:", !input.trim(), "loading:", isLoading, "no onModify:", !onModify);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("[AI-Panel] calling onModify with:", input.trim());
      await onModify(input.trim());
      console.log("[AI-Panel] onModify resolved successfully");
      setInput("");
      setIsOpen(false);
    } catch (err) {
      console.error("[AI-Panel] onModify threw error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full px-4 sm:px-0">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-2 w-full sm:w-auto"
          >
            <div className="flex gap-2">
              <Input
                placeholder="Modify my lesson plan..."
                className="flex-1 sm:w-96 h-12 bg-muted border-2 border-gray-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                autoFocus
              />
              <Button
                onClick={handleSubmit}
                size="icon"
                className="h-12 w-16 shrink-0 cursor-pointer"
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded p-2 hover:bg-gray-200 cursor-pointer"
      >
        {isOpen ? (
          <ChevronDown className="h-6 w-6 stroke-[3]" />
        ) : (
          <ChevronUp className="h-6 w-6 stroke-[3]" />
        )}
      </button>
    </div>
  );
}
