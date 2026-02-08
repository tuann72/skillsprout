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
        className="min-h-screen flex flex-col relative"
        style={{
          background:
            "linear-gradient(135deg, #ffffffff, #d3f7ffff, #e0eef0ff, #cef0f8ff, #aedee2ff, #b7e3eeff)",
          backgroundSize: "300% 300%",
          animation: "gradient-shift 12s ease infinite",
        }}
      >
        {/* Background pine trees */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none"
          style={{                                                                                                                            
            backgroundImage: "url('/pine-trees-forest.png')",                                                                                 
            backgroundRepeat: "repeat-x",                                                                                                     
            backgroundPosition: "bottom",
            backgroundSize: "auto 100%",
            opacity: 0.3,
          }}
        >
        </div>
        {/* Hero */}
        <section className="relative flex-1 flex flex-col items-center justify-start text-center px-6 pt-[20vh] pb-24">
          <Image
            src="/favicon.ico"
            alt="SkillSprout logo"
            width={80}
            height={80}
            className="mb-6"
          />
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-gray-900 mb-4">
            SkillSprout
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mb-8">
            Grow your skills with AI-generated lesson plans, visualized as
            interactive skill trees. From beginner to expert - one branch at a
            time.
          </p>
          <Link href="/home">
            <Button size="lg" className="text-base px-8 py-6 cursor-pointer">
              Start Learning
            </Button>
          </Link>
        </section>

        {/* Footer */}
        <footer className="relative py-8 text-center text-sm text-gray-600/80 border-t border-gray-400/20">
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
