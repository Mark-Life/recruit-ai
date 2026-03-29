"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  ArrowRightIcon,
  FileTextIcon,
  MapPinIcon,
  MonitorIcon,
  PlusIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import type { Match } from "@/lib/api";
import { fetchMatchesForTalent, useConfirmKeywords } from "@/lib/api";
import { useExtractTalentStream } from "@/lib/use-stream";
import { JobMatchCard, MatchCardSkeleton } from "../job-match-card";
import { TalentPipelineSteps } from "../talent-pipeline-steps";
import { type DraftInfo, FormPhase } from "./form-phase";

export default function NewTalentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<DraftInfo | null>(null);

  const restoredId = searchParams.get("id");
  useEffect(() => {
    if (restoredId && !draft) {
      router.replace(`/talents/${restoredId}`);
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
// Phase 2 -- Extraction + edit keywords + match
// ---------------------------------------------------------------------------

type RightPanelPhase = "streaming" | "editing" | "matching" | "matched";

function ExtractionPhase({ draft }: { draft: DraftInfo }) {
  const stream = useExtractTalentStream(draft.id);
  const started = useRef(false);
  const [phase, setPhase] = useState<RightPanelPhase>("streaming");
  const [keywords, setKeywords] = useState<readonly string[]>([]);
  const [matches, setMatches] = useState<readonly Match[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);
  const confirmKeywords = useConfirmKeywords(draft.id);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      stream.mutate();
    }
  }, [stream.mutate]);

  const extraction = stream.data;

  // streaming -> editing when stream completes
  useEffect(() => {
    if (!stream.isStreaming && stream.data && phase === "streaming") {
      setPhase("editing");
      setKeywords(stream.data.keywords ?? []);
    }
  }, [stream.isStreaming, stream.data, phase]);

  async function handleMatch() {
    setPhase("matching");
    setMatchError(null);
    try {
      await confirmKeywords.mutateAsync([...keywords]);
      const results = await fetchMatchesForTalent(draft.id);
      setMatches(results);
      setPhase("matched");
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : String(err));
      setPhase("editing");
    }
  }

  const pipelineStatusMap: Record<
    RightPanelPhase,
    "extracting" | "reviewing" | "matched"
  > = {
    streaming: "extracting",
    editing: "reviewing",
    matching: "reviewing",
    matched: "matched",
  };
  const pipelineStatus = pipelineStatusMap[phase];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        action={<TalentPipelineSteps status={pipelineStatus} />}
        title={extraction?.name ?? draft.name}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left panel -- submitted data */}
        <div className="min-h-0 border-b lg:w-2/5 lg:border-r lg:border-b-0">
          <ScrollArea className="h-full">
            <div className="p-5">
              <SubmittedDataPanel draft={draft} />
            </div>
          </ScrollArea>
        </div>

        {/* Right panel */}
        <div className="flex min-h-0 flex-1 flex-col">
          <RightPanel
            draft={draft}
            extraction={extraction}
            handleMatch={handleMatch}
            isStreaming={stream.isStreaming}
            keywords={keywords}
            matchError={matchError}
            matches={matches}
            phase={phase}
            setKeywords={setKeywords}
            streamError={stream.error}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left panel -- what the user submitted
// ---------------------------------------------------------------------------

function SubmittedDataPanel({ draft }: { draft: DraftInfo }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg leading-tight">{draft.name}</h2>
        <p className="text-muted-foreground text-sm">
          {draft.inputMode === "pdf"
            ? `PDF: ${draft.fileName}`
            : "Pasted resume text"}
        </p>
      </div>

      <Separator />

      {draft.resumeText && (
        <div className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Resume Text
          </span>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {draft.resumeText}
          </p>
        </div>
      )}

      {draft.inputMode === "pdf" && !draft.resumeText && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium text-sm">{draft.fileName}</span>
            <span className="text-muted-foreground text-xs">
              PDF uploaded for extraction
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right panel -- phases: streaming -> editing -> matching -> matched
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

function RightPanel({
  phase,
  extraction,
  isStreaming,
  streamError,
  draft,
  keywords,
  setKeywords,
  handleMatch,
  matchError,
  matches,
}: {
  phase: RightPanelPhase;
  extraction: StreamingExtraction | null;
  isStreaming: boolean;
  streamError: Error | null;
  draft: DraftInfo;
  keywords: readonly string[];
  setKeywords: (fn: (prev: readonly string[]) => readonly string[]) => void;
  handleMatch: () => void;
  matchError: string | null;
  matches: readonly Match[];
}) {
  const headerTextMap: Record<RightPanelPhase, string> = {
    streaming: "Analyzing resume to extract keywords and experience",
    editing: "Review keywords, add or remove, then match.",
    matching: "Finding matching jobs...",
    matched: "Profile and matching jobs ranked by fit.",
  };
  const headerText = headerTextMap[phase];

  return (
    <>
      {/* Pinned header */}
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">{headerText}</p>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 animate-pulse text-primary" />
            <span className="text-muted-foreground text-xs">Extracting...</span>
          </div>
        )}
        {phase === "editing" && (
          <Badge variant="outline">{keywords.length} keywords</Badge>
        )}
        {phase === "matched" && (
          <Badge variant="secondary">{matches.length} matches</Badge>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          {streamError && (
            <p className="text-destructive text-sm">{streamError.message}</p>
          )}
          {matchError && (
            <p className="text-destructive text-sm">{matchError}</p>
          )}

          {/* Profile summary */}
          <ProfileSummary
            draft={draft}
            extraction={extraction}
            isStreaming={isStreaming}
          />

          {/* Streaming: keyword skeletons */}
          {phase === "streaming" && (
            <StreamingKeywords
              extraction={extraction}
              isStreaming={isStreaming}
            />
          )}

          {/* Editing: editable keywords + match button */}
          {phase === "editing" && (
            <EditableKeywords
              keywords={keywords}
              onMatch={handleMatch}
              setKeywords={setKeywords}
            />
          )}

          {/* Matching: skeleton cards */}
          {phase === "matching" && (
            <div className="flex flex-col gap-3">
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <MatchCardSkeleton />
            </div>
          )}

          {/* Matched: real cards */}
          {phase === "matched" &&
            (matches.length === 0 ? (
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
            ))}
        </div>
      </ScrollArea>
    </>
  );
}

// ---------------------------------------------------------------------------
// Profile summary (name, title, meta tags)
// ---------------------------------------------------------------------------

function ProfileSummary({
  extraction,
  isStreaming,
  draft,
}: {
  extraction: StreamingExtraction | null;
  isStreaming: boolean;
  draft: DraftInfo;
}) {
  const showTitleSkeleton = isStreaming && !extraction?.title;
  const showMetaSkeleton =
    isStreaming && !extraction?.location && !extraction?.workModes;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg leading-tight">
          {extraction?.name ?? draft.name}
        </h2>
        {showTitleSkeleton ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          extraction?.title && (
            <p className="text-muted-foreground text-sm">{extraction.title}</p>
          )
        )}
      </div>

      {showMetaSkeleton ? (
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {extraction?.location && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPinIcon className="size-3.5" />
              {extraction.location}
            </span>
          )}
          {extraction?.workModes && extraction.workModes.length > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MonitorIcon className="size-3.5" />
              {extraction.workModes.join(" / ")}
            </span>
          )}
          {extraction?.experienceYears != null && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <UserIcon className="size-3.5" />
              {extraction.experienceYears} yrs exp
            </span>
          )}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Streaming keywords (read-only badges + skeletons)
// ---------------------------------------------------------------------------

function StreamingKeywords({
  extraction,
  isStreaming,
}: {
  extraction: StreamingExtraction | null;
  isStreaming: boolean;
}) {
  const showSkeleton =
    isStreaming &&
    (!extraction?.keywords || extraction.keywords.length === 0) &&
    !extraction?.experienceYears;

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

  if (!extraction?.keywords || extraction.keywords.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Keywords
      </span>
      <div className="flex flex-wrap gap-1.5">
        {extraction.keywords.map((kw) => (
          <Badge key={kw} variant="secondary">
            {kw}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable keywords + match button
// ---------------------------------------------------------------------------

function EditableKeywords({
  keywords,
  setKeywords,
  onMatch,
}: {
  keywords: readonly string[];
  setKeywords: (fn: (prev: readonly string[]) => readonly string[]) => void;
  onMatch: () => void;
}) {
  const [newKeyword, setNewKeyword] = useState("");

  function handleRemove(keyword: string) {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  }

  function handleAdd() {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
      setNewKeyword("");
    }
  }

  function handleKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <>
      {/* Editable keyword badges */}
      <div className="flex flex-col gap-3">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Keywords
        </span>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Badge className="gap-1.5 pr-1.5" key={keyword} variant="secondary">
              {keyword}
              <button
                aria-label={`Remove ${keyword}`}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                onClick={() => handleRemove(keyword)}
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
            onClick={handleAdd}
            size="sm"
            variant="outline"
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Match button */}
      <div className="flex justify-end pt-2">
        <Button onClick={onMatch}>
          Match
          <ArrowRightIcon className="ml-1 size-4" />
        </Button>
      </div>
    </>
  );
}
