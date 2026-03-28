"use client";

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
import {
  ArrowRightIcon,
  CheckIcon,
  CpuIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { PageHeader } from "@/components/page-header";
import type { Match, ScoreBreakdown, Talent } from "@/lib/api";
import { useConfirmSkills, useMatchesForTalent, useTalent } from "@/lib/api";
import { ResumeTextPanel } from "../resume-text-panel";
import { TalentPipelineSteps } from "../talent-pipeline-steps";

type Params = Promise<{ id: string }>;

export default function TalentDetailPage({ params }: { params: Params }) {
  const { id } = use(params);
  const { data: talent, isLoading } = useTalent(id);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Talent" />
        <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
          <SparklesIcon className="size-4 animate-pulse" />
          Loading...
        </div>
      </>
    );
  }

  if (!talent) {
    return (
      <>
        <PageHeader title="Talent" />
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          Talent not found.
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        action={<TalentPipelineSteps status={talent.status} />}
        title={talent.name}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left panel — Resume text */}
        <div className="min-h-0 border-b lg:w-2/5 lg:border-r lg:border-b-0">
          <ScrollArea className="h-full">
            <div className="p-5">
              <ResumeTextPanel talent={talent} />
            </div>
          </ScrollArea>
        </div>

        {/* Right panel — contextual content based on status */}
        <div className="flex min-h-0 flex-1 flex-col">
          <RightPanel talent={talent} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right panel dispatcher
// ---------------------------------------------------------------------------

function RightPanel({ talent }: { talent: Talent }) {
  switch (talent.status) {
    case "uploaded":
      return <UploadedPanel />;
    case "extracting":
      return <ExtractingPanel />;
    case "reviewing":
      return <ReviewingPanel talent={talent} />;
    case "matched":
      return <MatchedPanel talent={talent} />;
    default:
      return <ExtractingPanel />;
  }
}

// ---------------------------------------------------------------------------
// Uploaded — waiting to process
// ---------------------------------------------------------------------------

function UploadedPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-16">
      <div className="relative">
        <div className="relative flex size-16 items-center justify-center rounded-full bg-muted">
          <CpuIcon className="size-7 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="font-semibold text-base">Resume Uploaded</h3>
        <p className="max-w-xs text-muted-foreground text-sm">
          The resume has been received and is queued for skill extraction and
          analysis.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extracting — AI is processing
// ---------------------------------------------------------------------------

function ExtractingPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-16">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10">
          <CpuIcon className="size-7 text-primary" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="font-semibold text-base">Extracting Skills</h3>
        <p className="max-w-xs text-muted-foreground text-sm">
          Analyzing the resume to extract skills, experience, and key
          qualifications.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <AnalysisStep done label="Parsing resume text" />
        <AnalysisStep done label="Identifying experience sections" />
        <AnalysisStep active label="Extracting hard skills" />
        <AnalysisStep label="Generating talent profile" />
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
// Reviewing — edit extracted skills
// ---------------------------------------------------------------------------

function ReviewingPanel({ talent }: { talent: Talent }) {
  const router = useRouter();
  const [skills, setSkills] = useState<readonly string[]>(talent.skills);
  const [newSkill, setNewSkill] = useState("");
  const confirmSkills = useConfirmSkills(talent.id);

  function handleRemoveSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function handleAddSkill() {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setNewSkill("");
    }
  }

  function handleKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  }

  function handleConfirm() {
    confirmSkills.mutate([...skills], {
      onSuccess: () => {
        router.push(`/talents/${talent.id}`);
      },
    });
  }

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Review Extracted Skills</h3>
          <p className="text-muted-foreground text-sm">
            Verify and adjust the skills extracted from the resume. Remove
            incorrect ones or add missing skills.
          </p>
        </div>
        <Badge variant="outline">
          <PencilIcon className="mr-1 size-3" />
          {skills.length} skills
        </Badge>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          {/* Current skills */}
          <div className="flex flex-col gap-3">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Extracted Skills
            </span>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  className="gap-1.5 pr-1.5"
                  key={skill}
                  variant="secondary"
                >
                  {skill}
                  <button
                    aria-label={`Remove ${skill}`}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    onClick={() => handleRemoveSkill(skill)}
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Add new skill */}
          <div className="flex flex-col gap-2">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Add Skill
            </span>
            <div className="flex gap-2">
              <Input
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a skill and press Enter..."
                value={newSkill}
              />
              <Button
                disabled={!newSkill.trim()}
                onClick={handleAddSkill}
                size="sm"
                variant="outline"
              >
                <PlusIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Keywords */}
          {talent.keywords.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Keywords
              </span>
              <div className="flex flex-wrap gap-1.5">
                {talent.keywords.map((kw) => (
                  <Badge key={kw} variant="outline">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button disabled={confirmSkills.isPending} onClick={handleConfirm}>
              {confirmSkills.isPending ? (
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

// ---------------------------------------------------------------------------
// Matched — show matching jobs
// ---------------------------------------------------------------------------

function MatchedPanel({ talent }: { talent: Talent }) {
  const { data: matches, isLoading } = useMatchesForTalent(talent.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
        <SparklesIcon className="size-4 animate-pulse" />
        Loading matches...
      </div>
    );
  }

  const matchList = matches ?? [];

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Matching Jobs</h3>
          <p className="text-muted-foreground text-sm">
            Open positions ranked by fit against this talent's skills and
            experience.
          </p>
        </div>
        <Badge variant="secondary">{matchList.length} found</Badge>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          {matchList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <p className="text-sm">No matching jobs found.</p>
              <p className="text-xs">
                Try adding more skills or check back when new positions are
                posted.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matchList.map((match, i) => (
                <JobMatchCard key={match.id} match={match} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

// ---------------------------------------------------------------------------
// Job match card
// ---------------------------------------------------------------------------

const PERCENT = 100;

function JobMatchCard({ match, rank }: { match: Match; rank: number }) {
  const { breakdown, totalScore } = match;
  const pct = Math.round(totalScore * PERCENT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono font-semibold text-xs">
            {rank}
          </span>
          <span>Job #{match.jobDescriptionId.slice(0, 8)}</span>
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
