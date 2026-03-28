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
  CheckCircle2Icon,
  CpuIcon,
  MapPinIcon,
  MonitorIcon,
  SearchIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import type { Talent, TalentStatus } from "@/lib/api";

const STATUS_CONFIG: Record<
  TalentStatus,
  {
    label: string;
    icon: typeof SearchIcon;
    variant: "default" | "secondary" | "outline";
    className?: string;
  }
> = {
  uploaded: {
    label: "Uploaded",
    variant: "outline",
    icon: UploadIcon,
  },
  extracting: {
    label: "Extracting",
    variant: "secondary",
    icon: CpuIcon,
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  reviewing: {
    label: "Review Skills",
    variant: "secondary",
    icon: SearchIcon,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  matched: {
    label: "Matched",
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

export function TalentCard({ talent }: { talent: Talent }) {
  const config = STATUS_CONFIG[talent.status];
  const StatusIcon = config.icon;

  return (
    <Link href={`/talents/${talent.id}`}>
      <Card className="transition-colors hover:bg-muted/50" size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {talent.name}
          </CardTitle>
          <CardDescription>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{talent.title}</span>
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3.5 text-muted-foreground" />
                {talent.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <MonitorIcon className="size-3.5 text-muted-foreground" />
                {talent.workModes.join(" / ")}
              </span>
              <span className="text-muted-foreground/60">
                {formatRelativeDate(talent.createdAt)}
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
