"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MOCK_REDIRECT_DELAY_MS = 800;

export function NewJobDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit() {
    if (!(title.trim() && rawText.trim())) {
      return;
    }
    setIsSubmitting(true);
    // TODO: call POST /api/jobs with title + rawText
    setTimeout(() => {
      setOpen(false);
      router.push("/jobs/jd-2");
    }, MOCK_REDIRECT_DELAY_MS);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTitle("");
      setRawText("");
      setIsSubmitting(false);
    }
    setOpen(next);
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="size-4" />
          New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Job</DialogTitle>
          <DialogDescription>
            Paste the job description and we'll extract skills, match talents,
            and rank candidates automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-title">Role title</Label>
            <Input
              id="job-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              value={title}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-description">Job description</Label>
            <Textarea
              className="min-h-48 resize-none text-sm leading-relaxed"
              id="job-description"
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste the full job description here..."
              value={rawText}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={!(title.trim() && rawText.trim()) || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              "Analyzing..."
            ) : (
              <>
                Submit & Analyze
                <ArrowRightIcon className="ml-1 size-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
