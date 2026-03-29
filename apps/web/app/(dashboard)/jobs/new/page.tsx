"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  MonitorIcon,
  SparklesIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useCreateDraftJob } from "@/lib/api";
import { SEED_ORGANIZATION_ID } from "@/lib/seed-constants";
import { useExtractJobStream } from "@/lib/use-stream";
import { consumeStream } from "@/lib/utils";
import { JobPipelineSteps } from "../job-pipeline-steps";

interface DraftInfo {
  id: string;
  rawText: string;
  title: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<DraftInfo | null>(null);

  // On refresh with ?id=, redirect to the job detail page
  const restoredId = searchParams.get("id");
  useEffect(() => {
    if (restoredId && !draft) {
      router.replace(`/jobs/${restoredId}`);
    }
  }, [restoredId, draft, router]);

  if (restoredId && !draft) {
    return null;
  }

  if (draft) {
    return <ExtractionPhase draft={draft} />;
  }

  return <FormPhase onCreated={setDraft} />;
}

// ---------------------------------------------------------------------------
// Phase 1 — Form
// ---------------------------------------------------------------------------

function FormPhase({ onCreated }: { onCreated: (draft: DraftInfo) => void }) {
  const createDraft = useCreateDraftJob();

  const form = useForm({
    defaultValues: {
      title: "",
      rawText: "",
    },
    onSubmit: async ({ value }) => {
      const result = await createDraft.mutateAsync({
        rawText: value.rawText,
        title: value.title,
        organizationId: SEED_ORGANIZATION_ID,
      });
      window.history.replaceState(null, "", `/jobs/new?id=${result.id}`);
      onCreated({
        id: result.id,
        title: value.title,
        rawText: value.rawText,
      });
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="New Job" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-lg p-6">
          <p className="mb-6 text-muted-foreground text-sm">
            Paste the job description and we'll extract skills, match talents,
            and rank candidates automatically.
          </p>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="title"
              validators={{
                onSubmit: ({ value }) =>
                  value.trim() ? undefined : "Role title is required",
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="job-title">Role title</Label>
                  <Input
                    id="job-title"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-xs">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="rawText"
              validators={{
                onSubmit: ({ value }) =>
                  value.trim() ? undefined : "Job description is required",
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="job-description">Job description</Label>
                  <Textarea
                    className="min-h-48 resize-none text-sm leading-relaxed"
                    id="job-description"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Paste the full job description here..."
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-xs">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <div className="flex justify-end pt-2">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button disabled={!canSubmit} type="submit">
                    {isSubmitting ? (
                      "Creating..."
                    ) : (
                      <>
                        Submit & Analyze
                        <ArrowRightIcon className="ml-1 size-4" />
                      </>
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 2 — Extraction + inline refining (no navigation)
// ---------------------------------------------------------------------------

function ExtractionPhase({ draft }: { draft: DraftInfo }) {
  const stream = useExtractJobStream(draft.id);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      stream.mutate();
    }
  }, [stream.mutate]);

  const jd = stream.data?.jd;
  const questions = stream.data?.questions;
  const streamDone = !stream.isStreaming && stream.data != null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        action={<JobPipelineSteps status={streamDone ? "refining" : "draft"} />}
        title={jd?.roleTitle ?? draft.title}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left panel — mirrors JdTextPanel layout */}
        <div className="min-h-0 border-b lg:w-2/5 lg:border-r lg:border-b-0">
          <ScrollArea className="h-full">
            <div className="p-5">
              <StreamingJdPanel
                isStreaming={stream.isStreaming}
                jd={jd}
                rawText={draft.rawText}
                title={draft.title}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Right panel — streaming then interactive */}
        <div className="flex min-h-0 flex-1 flex-col">
          <QuestionsPanel
            error={stream.error}
            isStreaming={stream.isStreaming}
            jobId={draft.id}
            questions={questions}
            streamDone={streamDone}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left panel — same structure as JdTextPanel, with streaming data
// ---------------------------------------------------------------------------

interface StreamingJd {
  employmentType?: string;
  experienceYearsMax?: number;
  experienceYearsMin?: number;
  keywords?: readonly string[];
  location?: string;
  roleTitle?: string;
  seniority?: string;
  skills?: readonly string[];
  summary?: string;
  willingToSponsorRelocation?: boolean;
  workMode?: string;
}

function StreamingJdPanel({
  jd,
  title,
  rawText,
  isStreaming,
}: {
  jd: StreamingJd | undefined;
  title: string;
  rawText: string;
  isStreaming: boolean;
}) {
  const showMetaSkeleton = isStreaming && !jd?.location && !jd?.workMode;
  const showSkillsSkeleton =
    isStreaming && !jd?.seniority && (!jd?.skills || jd.skills.length === 0);
  const showSummarySkeleton = isStreaming && !jd?.summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg leading-tight">
          {jd?.roleTitle ?? title}
        </h2>
      </div>

      {/* Meta tags */}
      {showMetaSkeleton ? (
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {jd?.location && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPinIcon className="size-3.5" />
              {jd.location}
            </span>
          )}
          {jd?.workMode && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MonitorIcon className="size-3.5" />
              {jd.workMode}
            </span>
          )}
          {jd?.employmentType && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <BriefcaseIcon className="size-3.5" />
              {jd.employmentType}
            </span>
          )}
          {jd?.experienceYearsMin != null && jd?.experienceYearsMax != null && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <ClockIcon className="size-3.5" />
              {jd.experienceYearsMin}–{jd.experienceYearsMax} yrs
            </span>
          )}
        </div>
      )}

      {/* Skills */}
      {showSkillsSkeleton ? (
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {jd?.seniority && <Badge variant="outline">{jd.seniority}</Badge>}
          {jd?.skills?.map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* AI Summary */}
      {jd?.summary ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            AI Summary
          </span>
          <p className="text-sm leading-relaxed">{jd.summary}</p>
        </div>
      ) : (
        showSummarySkeleton && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              AI Summary
            </span>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
        )
      )}

      <Separator />

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Job Description
        </span>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{rawText}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right panel — streams questions, then transitions to interactive answers
// ---------------------------------------------------------------------------

interface StreamingQuestion {
  field?: string;
  options?: readonly string[];
  question?: string;
  reason?: string;
}

interface StreamingQuestions {
  questions?: readonly Partial<StreamingQuestion>[];
}

function QuestionsPanel({
  questions,
  isStreaming,
  streamDone,
  error,
  jobId,
}: {
  questions: StreamingQuestions | undefined;
  isStreaming: boolean;
  streamDone: boolean;
  error: Error | null;
  jobId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questionList = questions?.questions ?? [];

  const submitAnswers = useMutation({
    mutationFn: async (
      answerList: readonly { field: string; answer: string }[]
    ) => {
      const res = await fetch(`/api/jobs/${jobId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList }),
      });
      if (!res.ok) {
        throw new Error(`Failed: ${res.status}`);
      }
      await consumeStream(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      router.push(`/jobs/${jobId}`);
    },
  });

  function handleAnswer(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function handleConfirm() {
    const answerList = Object.entries(answers)
      .filter(([, v]) => v.trim() !== "")
      .map(([field, answer]) => ({ field, answer }));
    submitAnswers.mutate(answerList);
  }

  const answeredCount = Object.values(answers).filter(
    (v) => v.trim() !== ""
  ).length;

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Clarifying Questions</h3>
          <p className="text-muted-foreground text-sm">
            {streamDone && questionList.length > 0
              ? `${questionList.length} questions based on what's missing from the JD`
              : "Answer any questions to improve matching accuracy"}
          </p>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 animate-pulse text-primary" />
            <span className="text-muted-foreground text-xs">Analyzing...</span>
          </div>
        )}
        {streamDone && questionList.length > 0 && (
          <Badge variant="outline">
            {answeredCount}/{questionList.length} answered
          </Badge>
        )}
      </div>

      {/* Scrollable questions */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          {error && <p className="text-destructive text-sm">{error.message}</p>}

          {questionList.map((q, i) => (
            <QuestionBlock
              index={i + 1}
              interactive={streamDone}
              key={q?.field ?? i}
              onChange={(val) => handleAnswer(q.field ?? "", val)}
              question={q}
              value={answers[q.field ?? ""] ?? ""}
            />
          ))}

          {isStreaming && questionList.length === 0 && <QuestionSkeletons />}

          {streamDone && questionList.length === 0 && !error && (
            <p className="text-muted-foreground text-sm">
              No clarifying questions needed — submit to start matching.
            </p>
          )}

          {/* Confirm button — visible once streaming is done */}
          {streamDone && !error && (
            <div className="flex justify-end pt-2">
              <Button
                disabled={submitAnswers.isPending}
                onClick={handleConfirm}
              >
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
          )}
        </div>
      </ScrollArea>
    </>
  );
}

const QUESTION_SKELETON_KEYS = ["q-skel-1", "q-skel-2", "q-skel-3"] as const;

function QuestionSkeletons() {
  return (
    <>
      {QUESTION_SKELETON_KEYS.map((key) => (
        <div
          className="flex flex-col gap-2.5 rounded-lg border bg-card p-4"
          key={key}
        >
          <div className="flex items-start gap-2.5">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Question block — read-only during streaming, interactive after
// ---------------------------------------------------------------------------

function QuestionBlock({
  index,
  question,
  value,
  onChange,
  interactive,
}: {
  index: number;
  question: Partial<StreamingQuestion>;
  value: string;
  onChange: (val: string) => void;
  interactive: boolean;
}) {
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
}
