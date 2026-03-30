import { Badge } from "@workspace/ui/components/badge";
import {
  BriefcaseIcon,
  ClockIcon,
  MapPinIcon,
  MonitorIcon,
} from "lucide-react";
import type { Job } from "@/lib/api";

export const JdTextPanel = ({ job }: { job: Job }) => (
  <div className="flex flex-col gap-5">
    {/* Header */}
    <div className="flex flex-col gap-1">
      <h2 className="font-semibold text-lg leading-tight">{job.roleTitle}</h2>
    </div>

    {/* Meta tags */}
    {(job.location || job.workMode || job.employmentType) && (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {job.location && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPinIcon className="size-3.5" />
            {job.location}
          </span>
        )}
        {job.workMode && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MonitorIcon className="size-3.5" />
            {job.workMode}
          </span>
        )}
        {job.employmentType && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <BriefcaseIcon className="size-3.5" />
            {job.employmentType}
          </span>
        )}
        {job.experienceYearsMin != null && job.experienceYearsMax != null && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <ClockIcon className="size-3.5" />
            {job.experienceYearsMin}–{job.experienceYearsMax} yrs
          </span>
        )}
      </div>
    )}

    {/* Keywords */}
    {(job.seniority || job.keywords.length > 0) && (
      <div className="flex flex-wrap gap-1.5">
        {job.seniority && <Badge variant="outline">{job.seniority}</Badge>}
        {job.keywords.map((kw) => (
          <Badge key={kw} variant="secondary">
            {kw}
          </Badge>
        ))}
      </div>
    )}

    {/* AI Summary */}
    {job.summary && (
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          AI Summary
        </span>
        <p className="text-sm leading-relaxed">{job.summary}</p>
      </div>
    )}

    {/* Raw JD text */}
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
        Job Description
      </span>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {job.rawText}
      </p>
    </div>
  </div>
);
