"use client";

import { Button } from "@workspace/ui/components/button";
import { AlertCircleIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function TalentDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <PageHeader title="Talent" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
        <AlertCircleIcon className="size-8 text-destructive" />
        <p className="text-sm">{error.message || "Failed to load talent."}</p>
        <Button onClick={reset} size="sm" variant="outline">
          Try again
        </Button>
      </div>
    </>
  );
}
