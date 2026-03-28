"use client";

import { cn } from "@workspace/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import type { TalentStatus } from "@/lib/api";

const STEPS = [
  { key: "uploaded", label: "Upload" },
  { key: "extracting", label: "Extract" },
  { key: "reviewing", label: "Review" },
  { key: "matched", label: "Matched" },
] as const;

const STATUS_ORDER: Record<TalentStatus, number> = {
  uploaded: 0,
  extracting: 1,
  reviewing: 2,
  matched: 3,
};

export function TalentPipelineSteps({ status }: { status: TalentStatus }) {
  const currentIndex = STATUS_ORDER[status];

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div className="flex items-center gap-1" key={step.key}>
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-4 transition-colors",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full font-semibold text-[10px] transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent &&
                    "bg-primary/15 text-primary ring-1 ring-primary/40",
                  !(isCompleted || isCurrent) &&
                    "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckIcon className="size-3" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden font-medium text-xs sm:inline",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
