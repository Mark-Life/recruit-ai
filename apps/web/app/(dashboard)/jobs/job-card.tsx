import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  BriefcaseIcon,
  MapPinIcon,
  MonitorIcon,
  UsersIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { MockJobDescription } from "@/lib/mock-data";

const STATUS_CONFIG = {
  draft: { label: "Draft", variant: "outline" },
  refining: { label: "Refining", variant: "secondary" },
  matching: { label: "Matching", variant: "secondary" },
  ready: { label: "Ready", variant: "default" },
} as const;

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

function hrefForJob(job: MockJobDescription): Route {
  if (job.status === "refining") {
    return `/jobs/${job.id}/refine` as Route;
  }
  return `/jobs/${job.id}` as Route;
}

export function JobCard({ job }: { job: MockJobDescription }) {
  const statusConfig = STATUS_CONFIG[job.status];

  return (
    <Link href={hrefForJob(job)}>
      <Card className="transition-colors hover:bg-muted/50" size="sm">
        <CardHeader>
          <CardTitle>{job.roleTitle}</CardTitle>
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
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </span>
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
