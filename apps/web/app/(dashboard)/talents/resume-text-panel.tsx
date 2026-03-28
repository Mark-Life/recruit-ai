import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { MapPinIcon, MonitorIcon, UserIcon } from "lucide-react";
import type { Talent } from "@/lib/api";

export function ResumeTextPanel({ talent }: { talent: Talent }) {
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

      {/* Keywords */}
      {talent.keywords.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Keywords
          </span>
          <div className="flex flex-wrap gap-1.5">
            {talent.keywords.map((kw) => (
              <Badge key={kw} variant="outline">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
