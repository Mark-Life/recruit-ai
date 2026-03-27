"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  MailIcon,
  MapPinIcon,
  MonitorIcon,
  SearchIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { PageHeader } from "@/components/page-header";
import type {
  MockClarifyingQuestion,
  MockJobDescription,
  MockMatch,
  MockScoreBreakdown,
} from "@/lib/mock-data";
import {
  getJobById,
  getMatchesForJob,
  getQuestionsForJob,
} from "@/lib/mock-data";
import { JdTextPanel } from "../jd-text-panel";
import { JobPipelineSteps } from "../job-pipeline-steps";

type Params = Promise<{ id: string }>;

const MOCK_REDIRECT_DELAY_MS = 800;

export default function JobDetailPage({ params }: { params: Params }) {
  const { id } = use(params);
  const job = getJobById(id);

  if (!job) {
    return (
      <>
        <PageHeader title="Job" />
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          Job not found.
        </div>
      </>
    );
  }

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

function RightPanel({ job }: { job: MockJobDescription }) {
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
// Refining — clarifying questions
// ---------------------------------------------------------------------------

function RefiningPanel({ job }: { job: MockJobDescription }) {
  const router = useRouter();
  const questions = getQuestionsForJob(job.id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answeredCount = Object.values(answers).filter(
    (v) => v.trim() !== ""
  ).length;

  function handleAnswer(field: string, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function handleConfirm() {
    setIsSubmitting(true);
    // TODO: call POST /api/jobs/:id/answers
    setTimeout(() => {
      router.push(`/jobs/${job.id}`);
    }, MOCK_REDIRECT_DELAY_MS);
  }

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Clarifying Questions</h3>
          <p className="text-muted-foreground text-sm">
            {questions.length} questions based on what's missing from the JD
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
              No clarifying questions needed — the JD covers everything.
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button disabled={isSubmitting} onClick={handleConfirm}>
              {isSubmitting ? (
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
  question: MockClarifyingQuestion;
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
        <AnalysisStep done label="Extracting skills and requirements" />
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

function ReadyPanel({ job }: { job: MockJobDescription }) {
  const matches = getMatchesForJob(job.id);

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
        <Badge variant="secondary">{matches.length} found</Badge>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <p className="text-sm">No matches found.</p>
              <p className="text-xs">
                Try adjusting the job requirements or expanding location
                constraints.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matches.map((match, i) => (
                <MatchCard
                  jobSkills={job.skills}
                  key={match.id}
                  match={match}
                  rank={i + 1}
                />
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

function MatchCard({
  match,
  rank,
  jobSkills,
}: {
  match: MockMatch;
  rank: number;
  jobSkills: readonly string[];
}) {
  const { talent, recruiter, breakdown, totalScore } = match;
  const pct = Math.round(totalScore * PERCENT);

  const jobSkillsLower = new Set(jobSkills.map((s) => s.toLowerCase()));
  const matchedSkills = talent.skills.filter((s) =>
    jobSkillsLower.has(s.toLowerCase())
  );
  const otherSkills = talent.skills.filter(
    (s) => !jobSkillsLower.has(s.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono font-semibold text-xs">
            {rank}
          </span>
          <span>{talent.name}</span>
          <span className="font-normal text-muted-foreground">
            {talent.title}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon className="size-3.5" />
              {talent.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <MonitorIcon className="size-3.5" />
              {talent.workModes.join(" / ")}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserIcon className="size-3.5" />
              {talent.experienceYears} yrs exp
            </span>
          </div>

          {/* Total score */}
          <div className="flex items-center gap-3">
            <Progress className="h-2 flex-1" value={pct} />
            <span className="font-mono font-semibold text-sm tabular-nums">
              {pct}%
            </span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.map((s) => (
              <Badge className="gap-1" key={s} variant="default">
                <CheckIcon className="size-3" />
                {s}
              </Badge>
            ))}
            {otherSkills.map((s) => (
              <Badge key={s} variant="outline">
                {s}
              </Badge>
            ))}
          </div>

          {/* Score breakdown */}
          <ScoreBreakdownGrid breakdown={breakdown} />
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex w-full items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">
              {recruiter.name}
            </span>
            <Separator className="h-4" orientation="vertical" />
            <span className="inline-flex items-center gap-1">
              <MailIcon className="size-3.5" />
              {recruiter.email}
            </span>
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

const SCORE_LABELS: Record<keyof MockScoreBreakdown, string> = {
  semanticSimilarity: "Semantic",
  keywordOverlap: "Keywords",
  experienceFit: "Experience",
  constraintFit: "Constraints",
};

function ScoreBreakdownGrid({ breakdown }: { breakdown: MockScoreBreakdown }) {
  return (
    <div className="grid grid-cols-4 gap-3 rounded-lg border bg-muted/30 p-3">
      {(
        Object.entries(SCORE_LABELS) as [keyof MockScoreBreakdown, string][]
      ).map(([key, label]) => {
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
      })}
    </div>
  );
}
