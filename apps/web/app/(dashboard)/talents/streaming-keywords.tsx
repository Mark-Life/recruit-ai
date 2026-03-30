import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { StreamingExtraction } from "./streaming-extraction-types";

/** Read-only keyword badges with skeleton placeholders during streaming */
export const StreamingKeywords = ({
  data,
  isStreaming,
}: {
  data: StreamingExtraction | null;
  isStreaming: boolean;
}) => {
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
};
