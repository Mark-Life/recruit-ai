import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import {
  BriefcaseIcon,
  ClockIcon,
  MapPinIcon,
  MonitorIcon,
} from "lucide-react";
import type { MockJobDescription } from "@/lib/mock-data";

export function JdTextPanel({ job }: { job: MockJobDescription }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg leading-tight">{job.roleTitle}</h2>
        <p className="text-muted-foreground text-sm">{job.organizationName}</p>
      </div>

      {/* Meta tags */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MapPinIcon className="size-3.5" />
          {job.location}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MonitorIcon className="size-3.5" />
          {job.workMode}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <BriefcaseIcon className="size-3.5" />
          {job.employmentType}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <ClockIcon className="size-3.5" />
          {job.experienceYearsMin}–{job.experienceYearsMax} yrs
        </span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{job.seniority}</Badge>
        {job.skills.map((s) => (
          <Badge key={s} variant="secondary">
            {s}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* Raw JD text */}
      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Job Description
        </span>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {job.rawText}
        </p>
      </div>

      {/* Summary */}
      {job.summary && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            AI Summary
          </span>
          <p className="text-sm leading-relaxed">{job.summary}</p>
        </div>
      )}
    </div>
  );
}
