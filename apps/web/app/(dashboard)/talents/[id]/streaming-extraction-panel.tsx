import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { RefreshCwIcon, SparklesIcon } from "lucide-react";
import type { Talent } from "@/lib/api";
import { ProfileMeta } from "../profile-meta";
import type { StreamingExtraction } from "../streaming-extraction-types";
import { StreamingKeywords } from "../streaming-keywords";

/** Live extraction view — shared by DraftPanel and FailedExtractionPanel */
export const StreamingExtractionPanel = ({
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
}) => (
  <>
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

        <ProfileMeta
          experienceYears={data?.experienceYears}
          isStreaming={isStreaming}
          location={data?.location}
          name={data?.name ?? talent.name}
          title={data?.title}
          workModes={data?.workModes ? [...data.workModes] : []}
        />

        <StreamingKeywords data={data} isStreaming={isStreaming} />
      </div>
    </ScrollArea>
  </>
);
