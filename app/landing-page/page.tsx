"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const features = [
  {
    title: "AI-Powered Skill Trees",
    description:
      "Describe any skill you want to learn, and our AI generates a structured, layered lesson plan visualized as an interactive tree.",
  },
  {
    title: "Track Your Progress",
    description:
      "Mark lessons as complete, watch your progress bar grow, and celebrate milestones with confetti as you master new skills.",
  },
  {
    title: "Calendar Scheduling",
    description:
      "Automatically schedule your lessons into a calendar view with smart ordering based on prerequisites.",
  },
  {
    title: "Modify & Adapt",
    description:
      "Not happy with your plan? Ask the AI to adjust difficulty, add topics, or restructure - your progress is preserved.",
  },
];

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
            "linear-gradient(135deg, #c6d8b5, #dde5d4, #e8f0e0, #b8cfaa, #d4e4c8, #c6d8b5)",
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

        {/* Features */}
        <section className="px-6 pb-24 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="bg-white/70 border-0 shadow-sm"
              >
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
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
