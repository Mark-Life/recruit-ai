"use client";

import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PageHeader } from "@/components/page-header";
import { useJobs } from "@/lib/api";
import { JobCard } from "./job-card";
import { NewJobDialog } from "./new-job-dialog";

function JobList() {
  const { data: jobs } = useJobs();

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <p className="text-sm">No job descriptions yet.</p>
        <NewJobDialog />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => (
        <JobCard job={job} key={job.id} />
      ))}
    </div>
  );
}

export default function JobsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader action={<NewJobDialog />} title="Jobs" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <Suspense fallback={<LoadingSpinner label="Loading jobs..." />}>
            <JobList />
          </Suspense>
        </div>
      </ScrollArea>
    </div>
  );
}
