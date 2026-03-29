"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  ArrowRightIcon,
  CheckIcon,
  CpuIcon,
  MapPinIcon,
  MonitorIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PageHeader } from "@/components/page-header";
import type { Talent } from "@/lib/api";
import { useConfirmKeywords, useMatchesForTalent, useTalent } from "@/lib/api";
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
        <h3 className="font-semibold text-base">Extracting Keywords</h3>
        <p className="max-w-xs text-muted-foreground text-sm">
          Analyzing the resume to extract keywords, experience, and key
          qualifications.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <AnalysisStep done label="Parsing resume text" />
        <AnalysisStep done label="Identifying experience sections" />
        <AnalysisStep active label="Extracting keywords" />
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
