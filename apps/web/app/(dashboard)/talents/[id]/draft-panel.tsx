"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  AlertTriangleIcon,
  PlayIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Talent } from "@/lib/api";
import { useExtractTalentStream } from "@/lib/use-stream";
import { StreamingExtractionPanel } from "./streaming-extraction-panel";

/** Uploaded state — extraction not yet started */
export const DraftPanel = ({ talent }: { talent: Talent }) => {
  const queryClient = useQueryClient();
  const stream = useExtractTalentStream(talent.id);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!stream.isStreaming && started && !stream.error) {
      queryClient.invalidateQueries({ queryKey: ["talents", talent.id] });
      queryClient.invalidateQueries({ queryKey: ["talents"] });
    }
  }, [stream.isStreaming, started, stream.error, queryClient, talent.id]);

  const handleStart = () => {
    setStarted(true);
    stream.mutate();
  };

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
};
