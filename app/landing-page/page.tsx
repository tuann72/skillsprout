"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <>
      <style jsx>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
      <div
        className="min-h-screen flex flex-col"
        style={{
          background:
            "linear-gradient(135deg, #b5c8d8ff, #d4dee5ff, #e0ecf0ff, #aac8cfff, #c8e2e4ff, #b5d1d8ff)",
          backgroundSize: "300% 300%",
          animation: "gradient-shift 12s ease infinite",
        }}
      >
        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
          <Image
            src="/favicon.ico"
            alt="SkillSprout logo"
            width={80}
            height={80}
            className="mb-6"
          />
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-4">
            SkillSprout
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mb-8">
            Grow your skills with AI-generated lesson plans, visualized as
            interactive skill trees. From beginner to expert - one branch at a
            time.
          </p>
          <Link href="/">
            <Button size="lg" className="text-base px-8 py-6 cursor-pointer">
              Start Learning
            </Button>
          </Link>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-sm text-gray-600/80 border-t border-gray-400/20">
          <div className="flex items-center justify-center gap-2">
            <Image
              src="/favicon.ico"
              alt="SkillSprout logo"
              width={20}
              height={20}
            />
            <p>SkillSprout - Learn anything, one branch at a time.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
