import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  MapPinIcon,
  MessageSquareIcon,
  MonitorIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import type { JobStatus, MockJobDescription } from "@/lib/mock-data";

const STATUS_CONFIG: Record<
  JobStatus,
  {
    label: string;
    icon: typeof SearchIcon;
    variant: "default" | "secondary" | "outline";
    className?: string;
  }
> = {
  draft: {
    label: "Draft",
    variant: "outline",
    icon: BriefcaseIcon,
  },
  refining: {
    label: "Needs Input",
    variant: "secondary",
    icon: MessageSquareIcon,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  matching: {
    label: "Analyzing",
    variant: "secondary",
    icon: SearchIcon,
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  ready: {
    label: "Ready",
    variant: "default",
    icon: CheckCircle2Icon,
  },
};

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / MS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / HOURS_PER_DAY);
  return `${days}d ago`;
}

export function JobCard({ job }: { job: MockJobDescription }) {
  const config = STATUS_CONFIG[job.status];
  const StatusIcon = config.icon;

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="transition-colors hover:bg-muted/50" size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {job.roleTitle}
          </CardTitle>
          <CardDescription>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <BriefcaseIcon className="size-3.5 text-muted-foreground" />
                {job.organizationName}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3.5 text-muted-foreground" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <MonitorIcon className="size-3.5 text-muted-foreground" />
                {job.workMode}
              </span>
              <span className="text-muted-foreground/60">
                {formatRelativeDate(job.createdAt)}
              </span>
            </span>
          </CardDescription>
          <CardAction>
            <span className="flex items-center gap-2">
              {job.status === "ready" && job.matchCount > 0 && (
                <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                  <UsersIcon className="size-3.5" />
                  {job.matchCount} matches
                </span>
              )}
              <Badge
                className={cn("gap-1", config.className)}
                variant={config.variant}
              >
                <StatusIcon className="size-3" />
                {config.label}
              </Badge>
            </span>
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
