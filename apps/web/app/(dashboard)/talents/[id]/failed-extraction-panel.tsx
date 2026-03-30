"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { Talent } from "@/lib/api";
import { useExtractTalentStream } from "@/lib/use-stream";
import { StreamingExtractionPanel } from "./streaming-extraction-panel";

/** Extraction failed state — allow retry */
export const FailedExtractionPanel = ({ talent }: { talent: Talent }) => {
  const queryClient = useQueryClient();
  const stream = useExtractTalentStream(talent.id);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!stream.isStreaming && retrying && !stream.error) {
      queryClient.invalidateQueries({ queryKey: ["talents", talent.id] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    }
  }, [stream.isStreaming, retrying, stream.error, queryClient, talent.id]);

  const handleRetry = () => {
    setRetrying(true);
    stream.mutate();
  };

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
};
