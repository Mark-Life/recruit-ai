"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import { AlertCircleIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { Job, Match, ScoreBreakdown } from "@/lib/api";
import { useMatchesForJob } from "@/lib/api";
import { EditJobSheet } from "./edit-job-sheet";

/** Panel showing match results when a job is in "ready" state. */
export const ReadyPanel = ({ job }: { job: Job }) => (
  <ReadyPanelContent job={job} />
);

const ReadyPanelContent = ({ job }: { job: Job }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [strictFilters, setStrictFilters] = useState(false);
  const {
    data: matchList,
    error,
    isLoading,
    refetch,
  } = useMatchesForJob(job.id, strictFilters);

  if (isLoading) {
    return <LoadingSpinner label="Loading matches..." />;
  }

  if (error) {
    return (
      <div className="p-5">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Failed to load matches</AlertTitle>
          <AlertDescription>
            {error.message ||
              "An unexpected error occurred while ranking candidates."}
          </AlertDescription>
        </Alert>
        <div className="mt-3 flex justify-center">
          <Button onClick={() => refetch()} size="sm" variant="outline">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const matches = matchList ?? [];

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Matched Talents</h3>
          <p className="text-muted-foreground text-sm">
            Ranked by combined semantic, keyword, experience, and constraint
            scores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Switch
              checked={strictFilters}
              id="strict-filters"
              onCheckedChange={setStrictFilters}
            />
            <Label className="text-xs" htmlFor="strict-filters">
              Strict filters
            </Label>
          </div>
          <Button
            onClick={() => setEditOpen(true)}
            size="icon-sm"
            variant="ghost"
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Badge variant="secondary">{matches.length} found</Badge>
        </div>
      </div>

      <EditJobSheet job={job} onOpenChange={setEditOpen} open={editOpen} />

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
                <MatchCard key={match.id} match={match} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
};

const PERCENT = 100;
const ID_PREVIEW_LENGTH = 8;

const MatchCard = ({ match, rank }: { match: Match; rank: number }) => {
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
          <div className="flex items-center gap-3">
            <Progress className="h-2 flex-1" value={pct} />
            <span className="font-mono font-semibold text-sm tabular-nums">
              {pct}%
            </span>
          </div>

          <ScoreBreakdownGrid breakdown={breakdown} />
        </div>
      </CardContent>
    </Card>
  );
};

const SCORE_LABELS: Record<keyof ScoreBreakdown, string> = {
  semanticSimilarity: "Semantic",
  keywordOverlap: "Keywords",
  experienceFit: "Experience",
  constraintFit: "Constraints",
};

const ScoreBreakdownGrid = ({ breakdown }: { breakdown: ScoreBreakdown }) => (
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
