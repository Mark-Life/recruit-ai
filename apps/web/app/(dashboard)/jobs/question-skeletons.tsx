import { Skeleton } from "@workspace/ui/components/skeleton";

const QUESTION_SKELETON_KEYS = ["q-skel-1", "q-skel-2", "q-skel-3"] as const;

/** Placeholder skeleton cards shown while questions are loading. */
export const QuestionSkeletons = () => (
  <>
    {QUESTION_SKELETON_KEYS.map((key) => (
      <div
        className="flex flex-col gap-2.5 rounded-lg border bg-card p-4"
        key={key}
      >
        <div className="flex items-start gap-2.5">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </>
);
