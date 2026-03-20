"use client";

import Link from "next/link";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";

const STEPS = [
  {
    number: 1,
    title: "Set up microphone",
    description: "Grant mic access and verify your input is working",
    href: "/setup",
  },
  {
    number: 2,
    title: "Select your harmonica",
    description: "Choose the key of your diatonic harmonica",
    href: "/select",
  },
  {
    number: 3,
    title: "Calibrate",
    description: "Teach the system your harmonica's sound",
    href: "/calibrate",
  },
  {
    number: 4,
    title: "Start playing",
    description: "Learn mode to practice, or Control mode to navigate",
    href: "/learn",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-10 py-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Harmonica<span className="text-[var(--accent)]">OS</span>
        </h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          Control your computer with harmonica playing
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-4">
        {STEPS.map((step) => (
          <Link key={step.href} href={step.href} className="group">
            <Card className="flex items-center gap-4 transition-colors group-hover:border-[var(--accent)]/30">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-white">
                {step.number}
              </div>
              <div>
                <h2 className="font-semibold group-hover:text-[var(--accent)]">
                  {step.title}
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {step.description}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/learn">
          <Button size="lg">Learn Mode</Button>
        </Link>
        <Link href="/control">
          <Button variant="secondary" size="lg">
            Control Mode
          </Button>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <Card className="px-6 py-4">
          <div className="text-2xl font-bold">1</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">
            Right Arrow
          </div>
        </Card>
        <Card className="px-6 py-4">
          <div className="text-2xl font-bold">4</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">
            Spacebar
          </div>
        </Card>
        <Card className="px-6 py-4">
          <div className="text-2xl font-bold">5</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">
            Left Arrow
          </div>
        </Card>
      </div>
    </div>
  );
}
