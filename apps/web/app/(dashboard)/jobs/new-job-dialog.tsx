"use client";

import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
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
import { SEED_ORGANIZATION_ID } from "@/lib/seed-constants";

export function NewJobDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      title: "",
      rawText: "",
    },
    onSubmit: async ({ value }) => {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: value.rawText,
          title: value.title,
          organizationId: SEED_ORGANIZATION_ID,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create job: ${res.status}`);
      }

      // Consume stream to completion so the backend persists the JD
      const reader = res.body?.getReader();
      if (reader) {
        for (;;) {
          const { done } = await reader.read();
          if (done) {
            break;
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setOpen(false);
      // Navigate to jobs list — the new job will appear there
      router.push("/jobs");
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset();
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>New Job</DialogTitle>
            <DialogDescription>
              Paste the job description and we'll extract skills, match talents,
              and rank candidates automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <form.Field
              name="title"
              validators={{
                onSubmit: ({ value }) =>
                  value.trim() ? undefined : "Role title is required",
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="job-title">Role title</Label>
                  <Input
                    id="job-title"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-xs">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="rawText"
              validators={{
                onSubmit: ({ value }) =>
                  value.trim() ? undefined : "Job description is required",
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="job-description">Job description</Label>
                  <Textarea
                    className="min-h-48 resize-none text-sm leading-relaxed"
                    id="job-description"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Paste the full job description here..."
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-destructive text-xs">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button disabled={!canSubmit} type="submit">
                  {isSubmitting ? (
                    "Analyzing..."
                  ) : (
                    <>
                      Submit & Analyze
                      <ArrowRightIcon className="ml-1 size-4" />
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
