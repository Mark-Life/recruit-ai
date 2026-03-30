"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  MapPinIcon,
  MonitorIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PageHeader } from "@/components/page-header";
import type { Talent } from "@/lib/api";
import { useConfirmKeywords, useMatchesForTalent, useTalent } from "@/lib/api";
import { useExtractTalentStream } from "@/lib/use-stream";
import { JobMatchCard } from "../job-match-card";
import { ResumeTextPanel } from "../resume-text-panel";
import { TalentPipelineSteps } from "../talent-pipeline-steps";

type Params = Promise<{ id: string }>;

export default function TalentDetailPage({ params }: { params: Params }) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Talent" />
          <LoadingSpinner />
        </>
      }
    >
      <TalentDetailContent id={id} />
    </Suspense>
  );
}

function TalentDetailContent({ id }: { id: string }) {
  const { data: talent } = useTalent(id);

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

/** Extraction is considered incomplete when no keywords were extracted */
function isExtractionIncomplete(talent: Talent) {
  return talent.keywords.length === 0;
}

function RightPanel({ talent }: { talent: Talent }) {
  if (talent.status === "uploaded") {
    return <DraftPanel talent={talent} />;
  }

  if (talent.status === "extracting" && isExtractionIncomplete(talent)) {
    return <FailedExtractionPanel talent={talent} />;
  }

  switch (talent.status) {
    case "extracting":
    case "reviewing":
      return <ReviewingPanel talent={talent} />;
    case "matched":
      return <MatchedPanel talent={talent} />;
    default:
      return <DraftPanel talent={talent} />;
  }
}

// ---------------------------------------------------------------------------
// Profile meta (name, title, location, experience)
// ---------------------------------------------------------------------------

function ProfileMeta({ talent }: { talent: Talent }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg leading-tight">{talent.name}</h2>
        {talent.title && (
          <p className="text-muted-foreground text-sm">{talent.title}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {talent.location && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPinIcon className="size-3.5" />
            {talent.location}
          </span>
        )}
        {talent.workModes.length > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MonitorIcon className="size-3.5" />
            {talent.workModes.join(" / ")}
          </span>
        )}
        {talent.experienceYears > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <UserIcon className="size-3.5" />
            {talent.experienceYears} yrs exp
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Uploaded — extraction not yet started
// ---------------------------------------------------------------------------

function DraftPanel({ talent }: { talent: Talent }) {
  const queryClient = useQueryClient();
  const stream = useExtractTalentStream(talent.id);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!stream.isStreaming && started && !stream.error) {
      queryClient.invalidateQueries({ queryKey: ["talents", talent.id] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    }
  }, [stream.isStreaming, started, stream.error, queryClient, talent.id]);

  function handleStart() {
    setStarted(true);
    stream.mutate();
  }

  if (stream.isStreaming || stream.data) {
    return (
      <StreamingExtractionPanel
        data={stream.data}
        error={stream.error}
        isStreaming={stream.isStreaming}
        onRetry={handleStart}
        talent={talent}
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
          Run AI extraction to analyze the resume and extract keywords,
          experience, and qualifications.
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
// Extracting — extraction failed, allow retry
// ---------------------------------------------------------------------------

function FailedExtractionPanel({ talent }: { talent: Talent }) {
  const queryClient = useQueryClient();
  const stream = useExtractTalentStream(talent.id);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!stream.isStreaming && retrying && !stream.error) {
      queryClient.invalidateQueries({ queryKey: ["talents", talent.id] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    }
  }, [stream.isStreaming, retrying, stream.error, queryClient, talent.id]);

  function handleRetry() {
    setRetrying(true);
    stream.mutate();
  }

  if (stream.isStreaming || stream.data) {
    return (
      <StreamingExtractionPanel
        data={stream.data}
        error={stream.error}
        isStreaming={stream.isStreaming}
        onRetry={handleRetry}
        talent={talent}
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

interface StreamingExtraction {
  experienceYears?: number;
  keywords?: readonly string[];
  location?: string;
  name?: string;
  title?: string;
  willingToRelocate?: boolean;
  workModes?: readonly string[];
}

function StreamingKeywords({
  data,
  isStreaming,
}: {
  data: StreamingExtraction | null;
  isStreaming: boolean;
}) {
  const showSkeleton =
    isStreaming &&
    (!data?.keywords || data.keywords.length === 0) &&
    !data?.experienceYears;

  if (showSkeleton) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    );
  }

  if (!data?.keywords || data.keywords.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Keywords
      </span>
      <div className="flex flex-wrap gap-1.5">
        {data.keywords.map((kw) => (
          <Badge key={kw} variant="secondary">
            {kw}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function StreamingExtractionPanel({
  talent,
  data,
  isStreaming,
  error,
  onRetry,
}: {
  talent: Talent;
  data: StreamingExtraction | null;
  isStreaming: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">
            {error
              ? "Extraction failed. You can retry."
              : "Analyzing resume to extract keywords and experience."}
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

          {/* Profile summary */}
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-lg leading-tight">
              {data?.name ?? talent.name}
            </h2>
            {isStreaming && !data?.title ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              data?.title && (
                <p className="text-muted-foreground text-sm">{data.title}</p>
              )
            )}
          </div>

          {/* Meta tags */}
          {isStreaming && !data?.location && !data?.workModes ? (
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {data?.location && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPinIcon className="size-3.5" />
                  {data.location}
                </span>
              )}
              {data?.workModes && data.workModes.length > 0 && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MonitorIcon className="size-3.5" />
                  {data.workModes.join(" / ")}
                </span>
              )}
              {data?.experienceYears != null && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <UserIcon className="size-3.5" />
                  {data.experienceYears} yrs exp
                </span>
              )}
            </div>
          )}

          {/* Keywords */}
          <StreamingKeywords data={data} isStreaming={isStreaming} />
        </div>
      </ScrollArea>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reviewing — extracted profile + editable skills
// ---------------------------------------------------------------------------

function ReviewingPanel({ talent }: { talent: Talent }) {
  const router = useRouter();
  const [keywords, setKeywords] = useState<readonly string[]>(talent.keywords);
  const [newKeyword, setNewKeyword] = useState("");
  const confirmKeywords = useConfirmKeywords(talent.id);

  function handleRemoveKeyword(keyword: string) {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  }

  function handleAddKeyword() {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
      setNewKeyword("");
    }
  }

  function handleKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  }

  function handleConfirm() {
    confirmKeywords.mutate([...keywords], {
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
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">
            Review the extracted profile and adjust keywords before matching.
          </p>
        </div>
        <Badge variant="outline">
          <PencilIcon className="mr-1 size-3" />
          {keywords.length} keywords
        </Badge>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          <ProfileMeta talent={talent} />

          {/* Editable keywords */}
          <div className="flex flex-col gap-3">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Keywords
            </span>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <Badge
                  className="gap-1.5 pr-1.5"
                  key={keyword}
                  variant="secondary"
                >
                  {keyword}
                  <button
                    aria-label={`Remove ${keyword}`}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    onClick={() => handleRemoveKeyword(keyword)}
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Add new keyword */}
          <div className="flex flex-col gap-2">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Add Keyword
            </span>
            <div className="flex gap-2">
              <Input
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a keyword and press Enter..."
                value={newKeyword}
              />
              <Button
                disabled={!newKeyword.trim()}
                onClick={handleAddKeyword}
                size="sm"
                variant="outline"
              >
                <PlusIcon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              disabled={confirmKeywords.isPending}
              onClick={handleConfirm}
            >
              {confirmKeywords.isPending ? (
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
  return (
    <Suspense fallback={<LoadingSpinner label="Loading matches..." />}>
      <MatchedPanelContent talent={talent} />
    </Suspense>
  );
}

function MatchedPanelContent({ talent }: { talent: Talent }) {
  const { data: matchList } = useMatchesForTalent(talent.id);

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">
            Profile and matching jobs ranked by fit.
          </p>
        </div>
        <Badge variant="secondary">{matchList.length} matches</Badge>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          <ProfileMeta talent={talent} />

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

          {/* Matches */}
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
}
