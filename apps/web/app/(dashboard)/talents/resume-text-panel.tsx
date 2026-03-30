import { Separator } from "@workspace/ui/components/separator";
import { FileTextIcon } from "lucide-react";
import type { Talent } from "@/lib/api";

/** Left panel — shows the raw resume input (text or PDF indicator). */
export const ResumeTextPanel = ({ talent }: { talent: Talent }) => (
  <div className="flex flex-col gap-5">
    <div className="flex flex-col gap-1">
      <h2 className="font-semibold text-lg leading-tight">{talent.name}</h2>
      <p className="text-muted-foreground text-sm">
        {talent.resumePdfBase64 ? "PDF resume" : "Pasted resume text"}
      </p>
    </div>

    <Separator />

    {talent.resumeText && (
      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Resume Text
        </span>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {talent.resumeText}
        </p>
      </div>
    )}

    {talent.resumePdfBase64 && !talent.resumeText && (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="font-medium text-sm">Uploaded PDF</span>
          <span className="text-muted-foreground text-xs">
            PDF uploaded for extraction
          </span>
        </div>
      </div>
    )}

    {!(talent.resumeText || talent.resumePdfBase64) && (
      <p className="text-muted-foreground text-sm">
        No resume source available.
      </p>
    )}
  </div>
);
