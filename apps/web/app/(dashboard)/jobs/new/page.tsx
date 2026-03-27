"use client";

import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ArrowRightIcon,
  FileTextIcon,
  MessageSquareIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { JobPipelineSteps } from "../job-pipeline-steps";

const MOCK_REDIRECT_DELAY_MS = 800;

const FLOW_STEPS = [
  {
    icon: FileTextIcon,
    title: "Paste your JD",
    description: "Paste the raw job description text",
  },
  {
    icon: SparklesIcon,
    title: "AI extraction",
    description:
      "Skills, seniority, and requirements are extracted automatically",
  },
  {
    icon: MessageSquareIcon,
    title: "Clarifying questions",
    description: "Answer a few questions about missing details",
  },
  {
    icon: SearchIcon,
    title: "Talent matching",
    description: "Vector + tag matching across the talent pool",
  },
  {
    icon: UsersIcon,
    title: "Ranked results",
    description: "See top talents with score breakdowns and recruiter contacts",
  },
] as const;

export default function NewJobPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit() {
    if (!rawText.trim()) {
      return;
    }
    setIsSubmitting(true);
    // TODO: call POST /api/jobs with rawText
    setTimeout(() => {
      router.push("/jobs/jd-2");
    }, MOCK_REDIRECT_DELAY_MS);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        action={<JobPipelineSteps status="draft" />}
        title="New Job"
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left — JD input */}
        <div className="flex min-h-0 flex-col gap-4 border-b p-5 lg:w-2/5 lg:border-r lg:border-b-0">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-lg">Job Description</h2>
            <p className="text-muted-foreground text-sm">
              Paste the full job description. We'll handle the rest.
            </p>
          </div>
          <Textarea
            className="min-h-64 flex-1 resize-none font-[inherit] text-sm leading-relaxed"
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              "We are looking for a Senior Frontend Engineer with 5+ years of experience in React and TypeScript...\n\nPaste the complete job description here — the more detail, the better the matches."
            }
            value={rawText}
          />
          <div className="flex justify-end">
            <Button
              disabled={!rawText.trim() || isSubmitting}
              onClick={handleSubmit}
              size="default"
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
          </div>
        </div>

        {/* Right — How it works */}
        <div className="flex flex-1 items-start justify-center p-5">
          <div className="flex w-full max-w-sm flex-col gap-6 py-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-sm">How it works</h3>
              <p className="text-muted-foreground text-xs">
                From job description to ranked candidates in minutes.
              </p>
            </div>
            <div className="relative flex flex-col gap-0">
              {/* Vertical line */}
              <div className="absolute top-3 bottom-3 left-[11px] w-px bg-border" />

              {FLOW_STEPS.map((step) => (
                <div
                  className="relative flex items-start gap-3 py-3"
                  key={step.title}
                >
                  <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                    <step.icon className="size-3 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <span className="font-medium text-sm leading-none">
                      {step.title}
                    </span>
                    <span className="text-muted-foreground text-xs leading-snug">
                      {step.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
