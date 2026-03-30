"use client";

import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { Talent } from "@/lib/api";
import { useMatchesForTalent } from "@/lib/api";
import { JobMatchCard } from "../job-match-card";
import { ProfileMeta } from "../profile-meta";

/** Matched state — profile + ranked job matches */
export const MatchedPanel = ({ talent }: { talent: Talent }) => (
  <Suspense fallback={<LoadingSpinner label="Loading matches..." />}>
    <MatchedPanelContent talent={talent} />
  </Suspense>
);

const MatchedPanelContent = ({ talent }: { talent: Talent }) => {
  const { data: matchList } = useMatchesForTalent(talent.id);

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">
            Profile and matching jobs ranked by fit.
          </p>
        </div>
        <Badge variant="secondary">{matchList.length} matches</Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          <ProfileMeta
            experienceYears={talent.experienceYears}
            location={talent.location}
            name={talent.name}
            title={talent.title}
            workModes={talent.workModes}
          />

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

          {matchList.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <p className="text-sm">No matching jobs found.</p>
              <p className="text-xs">
                Try adding more keywords or check back when new positions are
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
};
