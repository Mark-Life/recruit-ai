"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Talent } from "@/lib/api";
import { useUpdateTalent } from "@/lib/api";

// TODO: import WorkMode from @workspace/core and WORK_MODES from a shared constants module
type WorkMode = "office" | "hybrid" | "remote";
const WORK_MODES: readonly WorkMode[] = ["office", "hybrid", "remote"];

/** Side-drawer form for editing a talent profile. */
export const EditTalentSheet = ({
  talent,
  open,
  onOpenChange,
}: {
  talent: Talent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const updateTalent = useUpdateTalent(talent.id);

  const [name, setName] = useState(talent.name);
  const [title, setTitle] = useState(talent.title);
  const [location, setLocation] = useState(talent.location);
  const [experienceYears, setExperienceYears] = useState(
    talent.experienceYears
  );
  const [workModes, setWorkModes] = useState<readonly WorkMode[]>(
    talent.workModes
  );
  const [willingToRelocate, setWillingToRelocate] = useState(
    talent.willingToRelocate
  );
  const [keywords, setKeywords] = useState<readonly string[]>(talent.keywords);
  const [newKeyword, setNewKeyword] = useState("");

  const toggleWorkMode = (mode: WorkMode) => {
    setWorkModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

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
    updateTalent.mutate(
      {
        name,
        title,
        location,
        experienceYears,
        workModes: [...workModes],
        willingToRelocate,
        keywords: [...keywords],
      },
      {
        onSuccess: () => {
          toast.success("Profile updated");
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
      <SheetContent className="sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>{talent.name}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-6">
          <div className="flex flex-col gap-5 pb-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="talent-name">Name</Label>
              <Input
                id="talent-name"
                onChange={(e) => setName(e.target.value)}
                value={name}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="talent-title">Title</Label>
              <Input
                id="talent-title"
                onChange={(e) => setTitle(e.target.value)}
                value={title}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="talent-location">Location</Label>
              <Input
                id="talent-location"
                onChange={(e) => setLocation(e.target.value)}
                value={location}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="talent-experience">Experience (years)</Label>
              <Input
                id="talent-experience"
                min={0}
                onChange={(e) => setExperienceYears(Number(e.target.value))}
                type="number"
                value={experienceYears}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Work Modes</Label>
              <div className="flex gap-2">
                {WORK_MODES.map((mode) => (
                  <Badge
                    className="cursor-pointer select-none"
                    key={mode}
                    onClick={() => toggleWorkMode(mode)}
                    variant={workModes.includes(mode) ? "default" : "outline"}
                  >
                    {mode}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="talent-relocate">Willing to relocate</Label>
              <Switch
                checked={willingToRelocate}
                id="talent-relocate"
                onCheckedChange={setWillingToRelocate}
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
          <Button disabled={updateTalent.isPending} onClick={handleSave}>
            {updateTalent.isPending ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
