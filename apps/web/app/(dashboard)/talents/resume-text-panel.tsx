import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { MapPinIcon, MonitorIcon, UserIcon } from "lucide-react";
import type { MockTalent } from "@/lib/mock-data";

export function ResumeTextPanel({ talent }: { talent: MockTalent }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-lg leading-tight">{talent.name}</h2>
        <p className="text-muted-foreground text-sm">{talent.title}</p>
      </div>

      {/* Meta tags */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MapPinIcon className="size-3.5" />
          {talent.location}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MonitorIcon className="size-3.5" />
          {talent.workModes.join(" / ")}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <UserIcon className="size-3.5" />
          {talent.experienceYears} yrs exp
        </span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5">
        {talent.skills.map((s) => (
          <Badge key={s} variant="secondary">
            {s}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* Raw resume text */}
      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Resume
        </span>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {talent.rawResumeText}
        </p>
      </div>

      {/* Summary */}
      {talent.summary && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            AI Summary
          </span>
          <p className="text-sm leading-relaxed">{talent.summary}</p>
        </div>
      )}
    </div>
  );
}
