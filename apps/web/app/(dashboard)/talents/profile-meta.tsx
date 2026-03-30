import { Skeleton } from "@workspace/ui/components/skeleton";
import { MapPinIcon, MonitorIcon, UserIcon } from "lucide-react";

interface ProfileMetaProps {
  experienceYears?: number | null;
  isStreaming?: boolean;
  location?: string | null;
  name: string;
  title?: string | null;
  workModes?: readonly string[];
}

/** Profile header: name, title, location, work modes, experience. Supports skeleton states during streaming. */
export const ProfileMeta = ({
  name,
  title,
  location,
  workModes = [],
  experienceYears,
  isStreaming = false,
}: ProfileMetaProps) => {
  const showTitleSkeleton = isStreaming && !title;
  const showMetaSkeleton = isStreaming && !location && workModes.length === 0;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg leading-tight">{name}</h2>
        {showTitleSkeleton ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          title && <p className="text-muted-foreground text-sm">{title}</p>
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
          {location && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPinIcon className="size-3.5" />
              {location}
            </span>
          )}
          {workModes.length > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MonitorIcon className="size-3.5" />
              {workModes.join(" / ")}
            </span>
          )}
          {experienceYears != null && experienceYears > 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <UserIcon className="size-3.5" />
              {experienceYears} yrs exp
            </span>
          )}
        </div>
      )}
    </>
  );
};
