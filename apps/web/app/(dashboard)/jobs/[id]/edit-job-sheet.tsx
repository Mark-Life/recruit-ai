"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Job } from "@/lib/api";
import { useUpdateJob } from "@/lib/api";

// TODO: import these option arrays and types from @workspace/core instead of redeclaring
const SENIORITY_OPTIONS = [
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
] as const;

const EMPLOYMENT_OPTIONS = ["full-time", "contract", "freelance"] as const;

const WORK_MODE_OPTIONS = ["office", "hybrid", "remote"] as const;

/** Side-drawer form for editing a job description. */
export const EditJobSheet = ({
  job,
  open,
  onOpenChange,
}: {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const updateJob = useUpdateJob(job.id);

  const [roleTitle, setRoleTitle] = useState(job.roleTitle);
  const [summary, setSummary] = useState(job.summary);
  const [location, setLocation] = useState(job.location);
  const [seniority, setSeniority] = useState(job.seniority);
  const [employmentType, setEmploymentType] = useState(job.employmentType);
  const [workMode, setWorkMode] = useState(job.workMode);
  const [experienceYearsMin, setExperienceYearsMin] = useState(
    job.experienceYearsMin
  );
  const [experienceYearsMax, setExperienceYearsMax] = useState(
    job.experienceYearsMax
  );
  const [willingToSponsorRelocation, setWillingToSponsorRelocation] = useState(
    job.willingToSponsorRelocation
  );
  const [keywords, setKeywords] = useState<readonly string[]>(job.keywords);
  const [newKeyword, setNewKeyword] = useState("");

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleSave = () => {
    updateJob.mutate(
      {
        roleTitle,
        summary,
        location,
        seniority,
        employmentType,
        workMode,
        experienceYearsMin,
        experienceYearsMax,
        willingToSponsorRelocation,
        keywords: [...keywords],
      },
      {
        onSuccess: () => {
          toast.success("Job updated");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(`Update failed: ${err.message}`);
        },
      }
    );
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>Edit Job</SheetTitle>
          <SheetDescription>{job.roleTitle}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-6">
          <div className="flex flex-col gap-5 pb-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-title">Role Title</Label>
              <Input
                id="job-title"
                onChange={(e) => setRoleTitle(e.target.value)}
                value={roleTitle}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-summary">Summary</Label>
              <Textarea
                id="job-summary"
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                value={summary}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="job-location">Location</Label>
              <Input
                id="job-location"
                onChange={(e) => setLocation(e.target.value)}
                value={location}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Seniority</Label>
                <Select
                  onValueChange={(v) => setSeniority(v as typeof seniority)}
                  value={seniority}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Employment</Label>
                <Select
                  onValueChange={(v) =>
                    setEmploymentType(v as typeof employmentType)
                  }
                  value={employmentType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Work Mode</Label>
              <Select
                onValueChange={(v) => setWorkMode(v as typeof workMode)}
                value={workMode}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-exp-min">Experience Min (yrs)</Label>
                <Input
                  id="job-exp-min"
                  min={0}
                  onChange={(e) =>
                    setExperienceYearsMin(Number(e.target.value))
                  }
                  type="number"
                  value={experienceYearsMin}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-exp-max">Experience Max (yrs)</Label>
                <Input
                  id="job-exp-max"
                  min={0}
                  onChange={(e) =>
                    setExperienceYearsMax(Number(e.target.value))
                  }
                  type="number"
                  value={experienceYearsMax}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="job-relocation">Sponsor relocation</Label>
              <Switch
                checked={willingToSponsorRelocation}
                id="job-relocation"
                onCheckedChange={setWillingToSponsorRelocation}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Keywords</Label>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <Badge
                    className="gap-1.5 pr-1.5"
                    key={kw}
                    variant="secondary"
                  >
                    {kw}
                    <button
                      aria-label={`Remove ${kw}`}
                      className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      onClick={() => removeKeyword(kw)}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="Add keyword..."
                  value={newKeyword}
                />
                <Button
                  disabled={!newKeyword.trim()}
                  onClick={addKeyword}
                  size="sm"
                  variant="outline"
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={updateJob.isPending} onClick={handleSave}>
            {updateJob.isPending ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
