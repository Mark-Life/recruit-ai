import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { Match, ScoreBreakdown } from "@/lib/api";

const PERCENT = 100;
const ID_PREVIEW_LENGTH = 8;

const SCORE_LABELS: Record<keyof ScoreBreakdown, string> = {
  semanticSimilarity: "Semantic",
  keywordOverlap: "Keywords",
  experienceFit: "Experience",
  constraintFit: "Constraints",
};

/** Ranked job match card with score breakdown */
export function JobMatchCard({ match, rank }: { match: Match; rank: number }) {
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
            {match.jobTitle ??
              `Job #${match.jobDescriptionId.slice(0, ID_PREVIEW_LENGTH)}`}
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
}

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

/** Placeholder skeleton while matches are loading */
export function MatchCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-2 flex-1" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
