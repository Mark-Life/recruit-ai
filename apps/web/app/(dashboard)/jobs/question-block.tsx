"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { CheckCircleIcon } from "lucide-react";

export interface QuestionBlockQuestion {
  field?: string;
  options?: readonly string[];
  question?: string;
  reason?: string;
}

/**
 * Renders a single clarifying question card.
 * When `interactive` is false, only displays the question (no input controls).
 */
export const QuestionBlock = ({
  index,
  question,
  value,
  onChange,
  interactive = true,
}: {
  index: number;
  question: QuestionBlockQuestion;
  value: string;
  onChange: (val: string) => void;
  interactive?: boolean;
}) => {
  const hasOptions = question.options != null && question.options.length > 0;
  const isAnswered = value.trim() !== "";

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border bg-card p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono font-semibold text-xs tabular-nums">
          {index}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-medium text-sm">{question.question}</p>
          {question.reason && (
            <p className="text-muted-foreground text-xs">{question.reason}</p>
          )}
        </div>
        {interactive && isAnswered && (
          <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        )}
      </div>

      {interactive && (
        <div className="pl-8">
          {hasOptions ? (
            <div className="flex flex-wrap gap-2">
              {question.options?.map((opt) => (
                <Button
                  key={opt}
                  onClick={() => onChange(opt)}
                  size="sm"
                  variant={value === opt ? "default" : "outline"}
                >
                  {opt}
                </Button>
              ))}
            </div>
          ) : (
            <Input
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your answer..."
              value={value}
            />
          )}
        </div>
      )}
    </div>
  );
};
