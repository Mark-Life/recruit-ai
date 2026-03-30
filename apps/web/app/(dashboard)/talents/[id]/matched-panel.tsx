"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import { AlertCircleIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { Talent } from "@/lib/api";
import { useMatchesForTalent } from "@/lib/api";
import { JobMatchCard } from "../job-match-card";
import { ProfileMeta } from "../profile-meta";
import { EditTalentSheet } from "./edit-talent-sheet";

/** Matched state — profile + ranked job matches */
export const MatchedPanel = ({ talent }: { talent: Talent }) => (
  <MatchedPanelContent talent={talent} />
);

const MatchedPanelContent = ({ talent }: { talent: Talent }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [strictFilters, setStrictFilters] = useState(false);
  const {
    data: matchList,
    error,
    isLoading,
    refetch,
  } = useMatchesForTalent(talent.id, strictFilters);

  if (isLoading) {
    return <LoadingSpinner label="Loading matches..." />;
  }

  if (error) {
    return (
      <div className="p-5">
        <ProfileMeta
          experienceYears={talent.experienceYears}
          location={talent.location}
          name={talent.name}
          title={talent.title}
          workModes={talent.workModes}
        />
        <div className="mt-5">
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Failed to load matches</AlertTitle>
            <AlertDescription>
              {error.message ||
                "An unexpected error occurred while ranking jobs."}
            </AlertDescription>
          </Alert>
          <div className="mt-3 flex justify-center">
            <Button onClick={() => refetch()} size="sm" variant="outline">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const matches = matchList ?? [];

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">
            Profile and matching jobs ranked by fit.
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
          <Badge variant="secondary">{matches.length} matches</Badge>
        </div>
      </div>

      <EditTalentSheet
        onOpenChange={setEditOpen}
        open={editOpen}
        talent={talent}
      />

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

          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <p className="text-sm">No matching jobs found.</p>
              <p className="text-xs">
                Try adding more keywords or check back when new positions are
                posted.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matches.map((match, i) => (
                <JobMatchCard key={match.id} match={match} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
};
