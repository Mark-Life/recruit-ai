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
import type { Job } from "@/lib/api";
import { useExtractJobStream } from "@/lib/use-stream";
import { StreamingJobExtractionPanel } from "./streaming-extraction-panel";

/** Panel shown when a job is in draft state — allows starting extraction. */
export const DraftPanel = ({ job }: { job: Job }) => {
  const queryClient = useQueryClient();
  const stream = useExtractJobStream(job.id);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!stream.isStreaming && started && !stream.error) {
      queryClient.invalidateQueries({ queryKey: ["jobs", job.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  }, [stream.isStreaming, started, stream.error, queryClient, job.id]);

  const handleStart = () => {
    setStarted(true);
    stream.mutate();
  };

  if (stream.isStreaming || stream.data) {
    return (
      <StreamingJobExtractionPanel
        data={stream.data}
        error={stream.error}
        isStreaming={stream.isStreaming}
        onRetry={handleStart}
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
          Run AI extraction to analyze the job description and generate
          structured data for matching.
        </p>
      </div>

      <Button onClick={handleStart}>
        <PlayIcon className="mr-1.5 size-4" />
        Start Extraction
      </Button>
    </div>
  );
};

/** Panel shown when extraction failed on a refining-state job. */
export const FailedExtractionPanel = ({ job }: { job: Job }) => {
  const queryClient = useQueryClient();
  const stream = useExtractJobStream(job.id);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!stream.isStreaming && retrying && !stream.error) {
      queryClient.invalidateQueries({ queryKey: ["jobs", job.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }
  }, [stream.isStreaming, retrying, stream.error, queryClient, job.id]);

  const handleRetry = () => {
    setRetrying(true);
    stream.mutate();
  };

  if (stream.isStreaming || stream.data) {
    return (
      <StreamingJobExtractionPanel
        data={stream.data}
        error={stream.error}
        isStreaming={stream.isStreaming}
        onRetry={handleRetry}
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
