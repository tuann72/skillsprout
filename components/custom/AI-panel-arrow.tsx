"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronUp, ChevronDown } from "lucide-react";

export function AIPanelArrow() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    // TODO: API call here
    console.log("Submit:", input);
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full px-4 sm:px-0">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex gap-2 w-full sm:w-auto"
          >
            <Input
              placeholder="Modify my task ..."
              className="flex-1 sm:w-96 h-12 bg-muted border-2 border-gray-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <Button
              onClick={handleSubmit}
              size="icon"
              className="h-12 w-16 shrink-0 cursor-pointer"
            >
              Submit
            </Button>
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
