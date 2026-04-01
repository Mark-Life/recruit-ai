"use client";

import type { ClarifyingQuestion } from "@workspace/core/domain/models/clarifying-question";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { ArrowRightIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Job } from "@/lib/api";
import { useSubmitAnswers } from "@/lib/api";
import { QuestionBlock } from "../question-block";
import { EditJobSheet } from "./edit-job-sheet";

/** Panel for answering clarifying questions before matching. */
export const RefiningPanel = ({ job }: { job: Job }) => {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submitAnswers = useSubmitAnswers(job.id);

  const questions: readonly ClarifyingQuestion[] = job.questions ?? [];

  const answeredCount = Object.values(answers).filter(
    (v) => v.trim() !== ""
  ).length;

  const handleAnswer = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    const answerList = Object.entries(answers)
      .filter(([, v]) => v.trim() !== "")
      .map(([field, answer]) => ({ field, answer }));
    submitAnswers.mutate(answerList, {
      onSuccess: () => router.push(`/jobs/${job.id}`),
    });
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Clarifying Questions</h3>
          <p className="text-muted-foreground text-sm">
            {questions.length > 0
              ? `${questions.length} questions based on what's missing from the JD`
              : "Answer any questions to improve matching accuracy"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setEditOpen(true)}
            size="icon-sm"
            variant="ghost"
          >
            <PencilIcon className="size-3.5" />
          </Button>
          {questions.length > 0 && (
            <Badge variant="outline">
              {answeredCount}/{questions.length} answered
            </Badge>
          )}
        </div>
      </div>

      <EditJobSheet job={job} onOpenChange={setEditOpen} open={editOpen} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          {questions.map((q, i) => (
            <QuestionBlock
              index={i + 1}
              key={q.field}
              onChange={(val) => handleAnswer(q.field, val)}
              question={q}
              value={answers[q.field] ?? ""}
            />
          ))}

          {questions.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No clarifying questions needed — submit to start matching.
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button disabled={submitAnswers.isPending} onClick={handleConfirm}>
              {submitAnswers.isPending ? (
                "Matching..."
              ) : (
                <>
                  Confirm & Match
                  <ArrowRightIcon className="ml-1 size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </>
  );
};
