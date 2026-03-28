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
} from "lucide-react";
import Link from "next/link";
import type { Job, JobStatus } from "@/lib/api";
import { formatRelativeDate } from "@/lib/utils";

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

export function JobCard({ job }: { job: Job }) {
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
            <Badge
              className={cn("gap-1", config.className)}
              variant={config.variant}
            >
              <StatusIcon className="size-3" />
              {config.label}
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
