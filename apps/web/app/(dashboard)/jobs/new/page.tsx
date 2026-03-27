"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";

const MOCK_REDIRECT_DELAY_MS = 800;

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
    // Mock: redirect to the refining page after a short delay
    setTimeout(() => {
      router.push("/jobs/jd-2/refine");
    }, MOCK_REDIRECT_DELAY_MS);
  }

  return (
    <>
      <PageHeader title="New Job Description" />
      <div className="mx-auto w-full max-w-2xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Paste the job description</CardTitle>
            <CardDescription>
              The system will extract structure, skills, and requirements
              automatically using AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Textarea
                className="min-h-48 resize-y"
                onChange={(e) => setRawText(e.target.value)}
                placeholder="We are looking for a Senior Frontend Engineer with 5+ years of experience in React and TypeScript..."
                value={rawText}
              />
              <div className="flex justify-end">
                <Button
                  disabled={!rawText.trim() || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Analyzing..." : "Submit & Analyze"}
                  {!isSubmitting && <ArrowRightIcon className="ml-1 size-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
