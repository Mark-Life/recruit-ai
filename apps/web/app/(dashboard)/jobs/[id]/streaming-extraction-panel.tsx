"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { RefreshCwIcon, SparklesIcon } from "lucide-react";

export interface StreamingJobData {
  jd?: Partial<{
    summary: string;
    roleTitle: string;
    keywords: readonly string[];
    seniority: string;
    employmentType: string;
    workMode: string;
    location: string;
    experienceYearsMin: number;
    experienceYearsMax: number;
  }>;
  questions?: Partial<{
    questions: readonly Partial<{
      field: string;
      question: string;
      reason: string;
    }>[];
  }>;
}

type StreamingJd = StreamingJobData["jd"];

/** Full streaming extraction panel with header, profile, and questions. */
export const StreamingJobExtractionPanel = ({
  data,
  isStreaming,
  error,
  onRetry,
}: {
  data: StreamingJobData | null;
  isStreaming: boolean;
  error: Error | null;
  onRetry: () => void;
}) => {
  const jd = data?.jd;
  const questionList = data?.questions?.questions ?? [];

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">
            {error
              ? "Extraction failed. You can retry."
              : "Analyzing job description and generating clarifying questions."}
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

          <StreamingJobProfile isStreaming={isStreaming} jd={jd} />
          <StreamingJobQuestions
            isStreaming={isStreaming}
            jd={jd}
            questionList={questionList}
          />
        </div>
      </ScrollArea>
    </>
  );
};

const StreamingJobProfile = ({
  jd,
  isStreaming,
}: {
  jd: StreamingJd;
  isStreaming: boolean;
}) => {
  const showMetaSkeleton = isStreaming && !jd?.location && !jd?.workMode;
  const showKeywordsSkeleton =
    isStreaming &&
    !jd?.seniority &&
    (!jd?.keywords || jd.keywords.length === 0);
  const showSummarySkeleton = isStreaming && !jd?.summary;

  return (
    <>
      {jd?.roleTitle && (
        <h2 className="font-semibold text-lg leading-tight">{jd.roleTitle}</h2>
      )}

      {showMetaSkeleton ? (
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {jd?.location && <Badge variant="outline">{jd.location}</Badge>}
          {jd?.workMode && <Badge variant="outline">{jd.workMode}</Badge>}
          {jd?.employmentType && (
            <Badge variant="outline">{jd.employmentType}</Badge>
          )}
          {jd?.experienceYearsMin != null && jd?.experienceYearsMax != null && (
            <Badge variant="outline">
              {jd.experienceYearsMin}–{jd.experienceYearsMax} yrs
            </Badge>
          )}
        </div>
      )}

      {showKeywordsSkeleton ? (
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ) : (
        (jd?.seniority || (jd?.keywords && jd.keywords.length > 0)) && (
          <div className="flex flex-col gap-2">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Keywords
            </span>
            <div className="flex flex-wrap gap-1.5">
              {jd?.seniority && <Badge variant="outline">{jd.seniority}</Badge>}
              {jd?.keywords?.map((kw) => (
                <Badge key={kw} variant="secondary">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )
      )}

      {jd?.summary ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            AI Summary
          </span>
          <p className="text-sm leading-relaxed">{jd.summary}</p>
        </div>
      ) : (
        showSummarySkeleton && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              AI Summary
            </span>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
        )
      )}
    </>
  );
};

const StreamingJobQuestions = ({
  questionList,
  isStreaming,
  jd,
}: {
  questionList: readonly Partial<{
    field: string;
    question: string;
    reason: string;
  }>[];
  isStreaming: boolean;
  jd: StreamingJd;
}) => {
  if (questionList.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Clarifying Questions
        </span>
        {questionList.map((q, i) => (
          <div
            className="flex gap-2.5 rounded-lg border bg-card p-3"
            key={q?.field ?? i}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono font-semibold text-xs">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-sm">{q.question}</p>
              {q.reason && (
                <p className="text-muted-foreground text-xs">{q.reason}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isStreaming && jd?.summary) {
    return (
      <div className="flex flex-col gap-3">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Clarifying Questions
        </span>
        {["q-skel-1", "q-skel-2", "q-skel-3"].map((key) => (
          <div className="flex gap-2.5 rounded-lg border bg-card p-3" key={key}>
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};
