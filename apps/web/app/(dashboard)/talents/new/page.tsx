"use client";

import type { ExtractTalentStreamData } from "@workspace/api/rpc";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { FileTextIcon, SparklesIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import type { Match } from "@/lib/api";
import { fetchMatchesForTalent, useConfirmKeywords } from "@/lib/api";
import { useExtractTalentStream } from "@/lib/use-stream";
import { EditableKeywords } from "../editable-keywords";
import { JobMatchCard, MatchCardSkeleton } from "../job-match-card";
import { ProfileMeta } from "../profile-meta";
import { StreamingKeywords } from "../streaming-keywords";
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

const ExtractionPhase = ({ draft }: { draft: DraftInfo }) => {
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

  useEffect(() => {
    if (!stream.isStreaming && stream.data && phase === "streaming") {
      setPhase("editing");
      setKeywords(
        stream.data.keywords?.filter((k): k is string => k != null) ?? []
      );
    }
  }, [stream.isStreaming, stream.data, phase]);

  const handleMatch = async () => {
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
  };

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
        <div className="min-h-0 border-b lg:w-2/5 lg:border-r lg:border-b-0">
          <ScrollArea className="h-full">
            <div className="p-5">
              <SubmittedDataPanel draft={draft} />
            </div>
          </ScrollArea>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <RightPanel
            draft={draft}
            extraction={extraction}
            isStreaming={stream.isStreaming}
            keywords={keywords}
            matchError={matchError}
            matches={matches}
            onMatch={handleMatch}
            phase={phase}
            setKeywords={setKeywords}
            streamError={stream.error}
          />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Left panel -- what the user submitted
// ---------------------------------------------------------------------------

const SubmittedDataPanel = ({ draft }: { draft: DraftInfo }) => (
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

// ---------------------------------------------------------------------------
// Right panel -- phases: streaming -> editing -> matching -> matched
// ---------------------------------------------------------------------------

const RightPanel = ({
  phase,
  extraction,
  isStreaming,
  streamError,
  draft,
  keywords,
  setKeywords,
  onMatch,
  matchError,
  matches,
}: {
  phase: RightPanelPhase;
  extraction: ExtractTalentStreamData | null;
  isStreaming: boolean;
  streamError: Error | null;
  draft: DraftInfo;
  keywords: readonly string[];
  setKeywords: (fn: (prev: readonly string[]) => readonly string[]) => void;
  onMatch: () => void;
  matchError: string | null;
  matches: readonly Match[];
}) => {
  const headerTextMap: Record<RightPanelPhase, string> = {
    streaming: "Analyzing resume to extract keywords and experience",
    editing: "Review keywords, add or remove, then match.",
    matching: "Finding matching jobs...",
    matched: "Profile and matching jobs ranked by fit.",
  };
  const headerText = headerTextMap[phase];

  return (
    <>
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

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          {streamError && (
            <p className="text-destructive text-sm">{streamError.message}</p>
          )}
          {matchError && (
            <p className="text-destructive text-sm">{matchError}</p>
          )}

          <ProfileMeta
            experienceYears={extraction?.experienceYears}
            isStreaming={isStreaming}
            location={extraction?.location}
            name={extraction?.name ?? draft.name}
            title={extraction?.title}
            workModes={extraction?.workModes?.filter((m) => m != null) ?? []}
          />

          {phase === "streaming" && (
            <StreamingKeywords data={extraction} isStreaming={isStreaming} />
          )}

          {phase === "editing" && (
            <EditableKeywords
              actionLabel="Match"
              keywords={keywords}
              onAction={onMatch}
              setKeywords={setKeywords}
            />
          )}

          {phase === "matching" && (
            <div className="flex flex-col gap-3">
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <MatchCardSkeleton />
            </div>
          )}

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
};
