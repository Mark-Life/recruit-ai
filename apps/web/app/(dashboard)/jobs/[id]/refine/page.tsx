"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { ArrowRightIcon, CheckCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { PageHeader } from "@/components/page-header";
import type { MockClarifyingQuestion } from "@/lib/mock-data";
import { getJobById, getQuestionsForJob } from "@/lib/mock-data";

const MOCK_REDIRECT_DELAY_MS = 800;

type Params = Promise<{ id: string }>;

export default function RefinePage({ params }: { params: Params }) {
  const { id } = use(params);
  const router = useRouter();
  const job = getJobById(id);
  const questions = getQuestionsForJob(id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!job) {
    return (
      <>
        <PageHeader title="Refine" />
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          Job not found.
        </div>
      </>
    );
  }

  const answeredFields = new Set(
    Object.entries(answers)
      .filter(([, v]) => v.trim() !== "")
      .map(([k]) => k)
  );

  function handleAnswer(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function handleConfirm() {
    setIsSubmitting(true);
    // TODO: call POST /api/jobs/:id/answers
    setTimeout(() => {
      router.push(`/jobs/${id}`);
    }, MOCK_REDIRECT_DELAY_MS);
  }

  return (
    <>
      <PageHeader title={`Refine: ${job.roleTitle}`} />
      <div className="grid flex-1 gap-4 p-4 md:grid-cols-5">
        {/* Left panel: extracted profile */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Extracted Profile</CardTitle>
            <CardDescription>
              Fields update as you answer questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <ProfileField label="Role" value={job.roleTitle} />
              <ProfileField
                answered={answeredFields.has("seniority")}
                label="Seniority"
                override={answers.seniority}
                value={job.seniority}
              />
              <ProfileField label="Skills" value={job.skills.join(", ")} />
              <ProfileField
                label="Experience"
                value={`${job.experienceYearsMin}–${job.experienceYearsMax} years`}
              />
              <Separator />
              <ProfileField
                answered={answeredFields.has("workMode")}
                label="Work Mode"
                override={answers.workMode}
                value={job.workMode}
              />
              <ProfileField
                answered={answeredFields.has("location")}
                label="Location"
                override={answers.location}
                value={job.location || "—"}
              />
              <ProfileField
                answered={answeredFields.has("willingToSponsorRelocation")}
                label="Relocation"
                override={answers.willingToSponsorRelocation}
                value={
                  job.willingToSponsorRelocation ? "Sponsored" : "Not offered"
                }
              />
              <ProfileField label="Employment" value={job.employmentType} />
            </div>
          </CardContent>
        </Card>

        {/* Right panel: clarifying questions */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Clarifying Questions</CardTitle>
            <CardDescription>
              {questions.length} questions based on what's missing from the JD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
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
                  No clarifying questions needed — the JD covers everything.
                </p>
              )}

              <div className="flex justify-end pt-2">
                <Button disabled={isSubmitting} onClick={handleConfirm}>
                  {isSubmitting ? "Matching..." : "Confirm & Match"}
                  {!isSubmitting && <ArrowRightIcon className="ml-1 size-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ProfileField({
  label,
  value,
  answered,
  override,
}: {
  label: string;
  value: string;
  answered?: boolean;
  override?: string;
}) {
  const displayValue = override?.trim() || value;

  return (
    <div className="flex items-start justify-between gap-2">
      <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-right text-sm">
        {answered && <CheckCircleIcon className="size-3.5 text-primary" />}
        {displayValue}
      </span>
    </div>
  );
}

function QuestionBlock({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: MockClarifyingQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  const hasOptions = question.options.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Badge className="mt-0.5 tabular-nums" variant="outline">
          {index}
        </Badge>
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{question.question}</p>
          <p className="text-muted-foreground text-xs">{question.reason}</p>
        </div>
      </div>
      <div className="pl-8">
        {hasOptions ? (
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
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
    </div>
  );
}
