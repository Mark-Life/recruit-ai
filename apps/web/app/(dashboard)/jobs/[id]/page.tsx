"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Separator } from "@workspace/ui/components/separator";
import {
  CheckIcon,
  MailIcon,
  MapPinIcon,
  MonitorIcon,
  UserIcon,
} from "lucide-react";
import { use } from "react";
import { PageHeader } from "@/components/page-header";
import type { MockMatch, MockScoreBreakdown } from "@/lib/mock-data";
import { getJobById, getMatchesForJob } from "@/lib/mock-data";

type Params = Promise<{ id: string }>;

export default function JobResultsPage({ params }: { params: Params }) {
  const { id } = use(params);
  const job = getJobById(id);
  const matches = getMatchesForJob(id);

  if (!job) {
    return (
      <>
        <PageHeader title="Job Results" />
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          Job not found.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        action={
          <span className="text-muted-foreground text-sm">
            {matches.length} matches
          </span>
        }
        title={job.roleTitle}
      />
      <div className="p-4">
        {/* JD summary bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <Badge variant="outline">{job.seniority}</Badge>
          <Badge variant="outline">{job.workMode}</Badge>
          <Badge variant="outline">{job.employmentType}</Badge>
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3.5" />
            {job.location}
          </span>
          <Separator className="h-4" orientation="vertical" />
          <span>
            {job.experienceYearsMin}–{job.experienceYearsMax} yrs
          </span>
          <Separator className="h-4" orientation="vertical" />
          <span className="flex flex-wrap gap-1">
            {job.skills.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </span>
        </div>

        {/* Match cards */}
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <p className="text-sm">No matches yet.</p>
            <p className="text-xs">
              Matches will appear here once the ranking pipeline completes.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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
    </>
  );
}

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
  const PERCENT = 100;
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
        <CardDescription>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
          </span>
        </CardDescription>
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
