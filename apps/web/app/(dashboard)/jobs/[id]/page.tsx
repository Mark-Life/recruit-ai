"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClarifyingQuestion } from "@workspace/core/domain/models/clarifying-question";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PageHeader } from "@/components/page-header";
import type { Job, Match, ScoreBreakdown } from "@/lib/api";
import { useJob, useMatchesForJob } from "@/lib/api";
import { useExtractJobStream } from "@/lib/use-stream";
import { consumeStream } from "@/lib/utils";
import { JdTextPanel } from "../jd-text-panel";
import { JobPipelineSteps } from "../job-pipeline-steps";

type Params = Promise<{ id: string }>;

export default function JobDetailPage({ params }: { params: Params }) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Job" />
          <LoadingSpinner />
        </>
      }
    >
      <JobDetailContent id={id} />
    </Suspense>
  );
}

function JobDetailContent({ id }: { id: string }) {
  const { data: job } = useJob(id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        action={<JobPipelineSteps status={job.status} />}
        title={job.roleTitle}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left panel — JD text */}
        <div className="min-h-0 border-b lg:w-2/5 lg:border-r lg:border-b-0">
          <ScrollArea className="h-full">
            <div className="p-5">
              <JdTextPanel job={job} />
            </div>
          </ScrollArea>
        </div>

        {/* Right panel — contextual content based on status */}
        <div className="flex min-h-0 flex-1 flex-col">
          <RightPanel job={job} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right panel dispatcher
// ---------------------------------------------------------------------------

/** Extraction is considered incomplete when critical fields are empty */
function isExtractionIncomplete(job: Job) {
  return !job.summary && job.keywords.length === 0;
}

function RightPanel({ job }: { job: Job }) {
  if (job.status === "draft") {
    return <DraftPanel job={job} />;
  }

  if (job.status === "refining" && isExtractionIncomplete(job)) {
    return <FailedExtractionPanel job={job} />;
  }

  switch (job.status) {
    case "refining":
      return <RefiningPanel job={job} />;
    case "matching":
      return <MatchingPanel />;
    case "ready":
      return <ReadyPanel job={job} />;
    default:
      return <MatchingPanel />;
  }
}

// ---------------------------------------------------------------------------
// Draft — extraction not yet started
// ---------------------------------------------------------------------------

function DraftPanel({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const stream = useExtractJobStream(job.id);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!stream.isStreaming && started && !stream.error) {
      queryClient.invalidateQueries({ queryKey: ["jobs", job.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  }, [stream.isStreaming, started, stream.error, queryClient, job.id]);

  function handleStart() {
    setStarted(true);
    stream.mutate();
  }

  if (stream.isStreaming || stream.data) {
    return (
      <StreamingJobExtractionPanel
        data={stream.data}
        error={stream.error}
        isStreaming={stream.isStreaming}
        onRetry={handleStart}
      />
    );
  }

  if (stream.error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-16">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangleIcon className="size-7 text-destructive" />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h3 className="font-semibold text-base">Extraction Failed</h3>
          <p className="max-w-xs text-muted-foreground text-sm">
            {stream.error.message}
          </p>
        </div>
        <Button onClick={handleStart} variant="outline">
          <RefreshCwIcon className="mr-1.5 size-4" />
          Retry Extraction
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-16">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <SparklesIcon className="size-7 text-primary" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="font-semibold text-base">Ready to Process</h3>
        <p className="max-w-xs text-muted-foreground text-sm">
          Run AI extraction to analyze the job description and generate
          structured data for matching.
        </p>
      </div>

      <Button onClick={handleStart}>
        <PlayIcon className="mr-1.5 size-4" />
        Start Extraction
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Refining — extraction failed, allow retry
// ---------------------------------------------------------------------------

function FailedExtractionPanel({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const stream = useExtractJobStream(job.id);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!stream.isStreaming && retrying && !stream.error) {
      queryClient.invalidateQueries({ queryKey: ["jobs", job.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  }, [stream.isStreaming, retrying, stream.error, queryClient, job.id]);

  function handleRetry() {
    setRetrying(true);
    stream.mutate();
  }

  if (stream.isStreaming || stream.data) {
    return (
      <StreamingJobExtractionPanel
        data={stream.data}
        error={stream.error}
        isStreaming={stream.isStreaming}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-16">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangleIcon className="size-7 text-destructive" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="font-semibold text-base">Extraction Failed</h3>
        <p className="max-w-xs text-muted-foreground text-sm">
          The AI extraction did not complete. This can happen due to rate limits
          or temporary service issues.
        </p>
      </div>

      <Button onClick={handleRetry} variant="outline">
        <RefreshCwIcon className="mr-1.5 size-4" />
        Retry Extraction
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streaming extraction — shared by DraftPanel and FailedExtractionPanel
// ---------------------------------------------------------------------------

interface StreamingJobData {
  jd?: Partial<{
    summary: string;
    roleTitle: string;
    keywords: readonly string[];
    seniority: string;
    employmentType: string;
    workMode: string;
    location: string;
    experienceYearsMin: number;
    experienceYearsMax: number;
  }>;
  questions?: Partial<{
    questions: readonly Partial<{
      field: string;
      question: string;
      reason: string;
    }>[];
  }>;
}

function StreamingJobExtractionPanel({
  data,
  isStreaming,
  error,
  onRetry,
}: {
  data: StreamingJobData | null;
  isStreaming: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const jd = data?.jd;
  const questionList = data?.questions?.questions ?? [];

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">
            {error
              ? "Extraction failed. You can retry."
              : "Analyzing job description and generating clarifying questions."}
          </p>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 animate-pulse text-primary" />
            <span className="text-muted-foreground text-xs">Extracting...</span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          {error && (
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-destructive text-sm">{error.message}</p>
              <Button onClick={onRetry} size="sm" variant="outline">
                <RefreshCwIcon className="mr-1.5 size-4" />
                Retry
              </Button>
            </div>
          )}

          <StreamingJobProfile isStreaming={isStreaming} jd={jd} />
          <StreamingJobQuestions
            isStreaming={isStreaming}
            jd={jd}
            questionList={questionList}
          />
        </div>
      </ScrollArea>
    </>
  );
}

type StreamingJd = StreamingJobData["jd"];

function StreamingJobProfile({
  jd,
  isStreaming,
}: {
  jd: StreamingJd;
  isStreaming: boolean;
}) {
  const showMetaSkeleton = isStreaming && !jd?.location && !jd?.workMode;
  const showKeywordsSkeleton =
    isStreaming &&
    !jd?.seniority &&
    (!jd?.keywords || jd.keywords.length === 0);
  const showSummarySkeleton = isStreaming && !jd?.summary;

  return (
    <>
      {jd?.roleTitle && (
        <h2 className="font-semibold text-lg leading-tight">{jd.roleTitle}</h2>
      )}

      {/* Meta tags */}
      {showMetaSkeleton ? (
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {jd?.location && <Badge variant="outline">{jd.location}</Badge>}
          {jd?.workMode && <Badge variant="outline">{jd.workMode}</Badge>}
          {jd?.employmentType && (
            <Badge variant="outline">{jd.employmentType}</Badge>
          )}
          {jd?.experienceYearsMin != null && jd?.experienceYearsMax != null && (
            <Badge variant="outline">
              {jd.experienceYearsMin}–{jd.experienceYearsMax} yrs
            </Badge>
          )}
        </div>
      )}

      {/* Keywords */}
      {showKeywordsSkeleton ? (
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ) : (
        (jd?.seniority || (jd?.keywords && jd.keywords.length > 0)) && (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Keywords
            </span>
            <div className="flex flex-wrap gap-1.5">
              {jd?.seniority && <Badge variant="outline">{jd.seniority}</Badge>}
              {jd?.keywords?.map((kw) => (
                <Badge key={kw} variant="secondary">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )
      )}

      {/* Summary */}
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
    </>
  );
}

function StreamingJobQuestions({
  questionList,
  isStreaming,
  jd,
}: {
  questionList: readonly Partial<{
    field: string;
    question: string;
    reason: string;
  }>[];
  isStreaming: boolean;
  jd: StreamingJd;
}) {
  if (questionList.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Clarifying Questions
        </span>
        {questionList.map((q, i) => (
          <div
            className="flex gap-2.5 rounded-lg border bg-card p-3"
            key={q?.field ?? i}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono font-semibold text-xs">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-sm">{q.question}</p>
              {q.reason && (
                <p className="text-muted-foreground text-xs">{q.reason}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isStreaming && jd?.summary) {
    return (
      <div className="flex flex-col gap-3">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Clarifying Questions
        </span>
        {["q-skel-1", "q-skel-2", "q-skel-3"].map((key) => (
          <div className="flex gap-2.5 rounded-lg border bg-card p-3" key={key}>
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Refining — clarifying questions
// ---------------------------------------------------------------------------

function RefiningPanel({ job }: { job: Job }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions: readonly ClarifyingQuestion[] = job.questions ?? [];

  const submitAnswers = useMutation({
    mutationFn: async (
      answerList: readonly { field: string; answer: string }[]
    ) => {
      const res = await fetch(`/api/jobs/${job.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList }),
      });
      if (!res.ok) {
        throw new Error(`Failed: ${res.status}`);
      }
      // Consume streaming response to completion
      await consumeStream(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", job.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      router.push(`/jobs/${job.id}`);
    },
  });

  const answeredCount = Object.values(answers).filter(
    (v) => v.trim() !== ""
  ).length;

  function handleAnswer(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function handleConfirm() {
    const answerList = Object.entries(answers)
      .filter(([, v]) => v.trim() !== "")
      .map(([field, answer]) => ({ field, answer }));
    submitAnswers.mutate(answerList);
  }

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Clarifying Questions</h3>
          <p className="text-muted-foreground text-sm">
            {questions.length > 0
              ? `${questions.length} questions based on what's missing from the JD`
              : "Answer any questions to improve matching accuracy"}
          </p>
        </div>
        {questions.length > 0 && (
          <Badge variant="outline">
            {answeredCount}/{questions.length} answered
          </Badge>
        )}
      </div>

      {/* Scrollable questions */}
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
}

function QuestionBlock({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: ClarifyingQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  const hasOptions = question.options.length > 0;
  const isAnswered = value.trim() !== "";

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border bg-card p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono font-semibold text-xs tabular-nums">
          {index}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-medium text-sm">{question.question}</p>
          <p className="text-muted-foreground text-xs">{question.reason}</p>
        </div>
        {isAnswered && (
          <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        )}
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

// ---------------------------------------------------------------------------
// Matching — analyzing state
// ---------------------------------------------------------------------------

function MatchingPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-16">
      {/* Pulsing search icon */}
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10">
          <SearchIcon className="size-7 text-primary" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="font-semibold text-base">Analyzing & Matching</h3>
        <p className="max-w-xs text-muted-foreground text-sm">
          Running vector similarity search and scoring talents against this job
          description.
        </p>
      </div>

      {/* Animated steps */}
      <div className="flex flex-col gap-3 pt-2">
        <AnalysisStep done label="Extracting keywords and requirements" />
        <AnalysisStep done label="Generating embedding vector" />
        <AnalysisStep active label="Searching talent pool" />
        <AnalysisStep label="Scoring and ranking matches" />
      </div>
    </div>
  );
}

function AnalysisStep({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  function renderIcon() {
    if (done) {
      return (
        <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3" />
        </div>
      );
    }
    if (active) {
      return (
        <div className="flex size-5 items-center justify-center">
          <SparklesIcon className="size-4 animate-pulse text-primary" />
        </div>
      );
    }
    return (
      <div className="size-5 rounded-full border border-border bg-muted" />
    );
  }

  function labelClassName() {
    if (done) {
      return "text-muted-foreground text-sm line-through";
    }
    if (active) {
      return "font-medium text-foreground text-sm";
    }
    return "text-muted-foreground text-sm";
  }

  return (
    <div className="flex items-center gap-2.5">
      {renderIcon()}
      <span className={labelClassName()}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ready — match results
// ---------------------------------------------------------------------------

function ReadyPanel({ job }: { job: Job }) {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading matches..." />}>
      <ReadyPanelContent job={job} />
    </Suspense>
  );
}

function ReadyPanelContent({ job }: { job: Job }) {
  const { data: matchList } = useMatchesForJob(job.id);

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Matched Talents</h3>
          <p className="text-muted-foreground text-sm">
            Ranked by combined semantic, keyword, experience, and constraint
            scores.
          </p>
        </div>
        <Badge variant="secondary">{matchList.length} found</Badge>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          {matchList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <p className="text-sm">No matches found.</p>
              <p className="text-xs">
                Try adjusting the job requirements or expanding location
                constraints.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matchList.map((match, i) => (
                <MatchCard key={match.id} match={match} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

// ---------------------------------------------------------------------------
// Match card
// ---------------------------------------------------------------------------

const PERCENT = 100;
const ID_PREVIEW_LENGTH = 8;

function MatchCard({ match, rank }: { match: Match; rank: number }) {
  const { breakdown, totalScore } = match;
  const pct = Math.round(totalScore * PERCENT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono font-semibold text-xs">
            {rank}
          </span>
          <span>
            {match.talentName ??
              `Talent #${match.talentId.slice(0, ID_PREVIEW_LENGTH)}`}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Total score */}
          <div className="flex items-center gap-3">
            <Progress className="h-2 flex-1" value={pct} />
            <span className="font-mono font-semibold text-sm tabular-nums">
              {pct}%
            </span>
          </div>

          {/* Score breakdown */}
          <ScoreBreakdownGrid breakdown={breakdown} />
        </div>
      </CardContent>
    </Card>
  );
}

const SCORE_LABELS: Record<keyof ScoreBreakdown, string> = {
  semanticSimilarity: "Semantic",
  keywordOverlap: "Keywords",
  experienceFit: "Experience",
  constraintFit: "Constraints",
};

function ScoreBreakdownGrid({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="grid grid-cols-4 gap-3 rounded-lg border bg-muted/30 p-3">
      {(Object.entries(SCORE_LABELS) as [keyof ScoreBreakdown, string][]).map(
        ([key, label]) => {
          const value = breakdown[key];
          return (
            <div className="flex flex-col items-center gap-1" key={key}>
              <span className="font-mono font-semibold text-sm tabular-nums">
                {value.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {label}
              </span>
            </div>
          );
        }
      )}
    </div>
  );
}
