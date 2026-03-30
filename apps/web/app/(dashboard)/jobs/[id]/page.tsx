"use client";

import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Suspense, use } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PageHeader } from "@/components/page-header";
import type { Job } from "@/lib/api";
import { useJob } from "@/lib/api";
import { JdTextPanel } from "../jd-text-panel";
import { JobPipelineSteps } from "../job-pipeline-steps";
import { DraftPanel, FailedExtractionPanel } from "./draft-panel";
import { MatchingPanel } from "./matching-panel";
import { ReadyPanel } from "./ready-panel";
import { RefiningPanel } from "./refining-panel";

type Params = Promise<{ id: string }>;

export default function JobDetailPage({ params }: { params: Params }) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Job" />
          <LoadingSpinner />
        </>
      }
    >
      <JobDetailContent id={id} />
    </Suspense>
  );
}

const JobDetailContent = ({ id }: { id: string }) => {
  const { data: job } = useJob(id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        action={<JobPipelineSteps status={job.status} />}
        title={job.roleTitle}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 border-b lg:w-2/5 lg:border-r lg:border-b-0">
          <ScrollArea className="h-full">
            <div className="p-5">
              <JdTextPanel job={job} />
            </div>
          </ScrollArea>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <RightPanel job={job} />
        </div>
      </div>
    </div>
  );
};

/** Extraction is considered incomplete when critical fields are empty */
const isExtractionIncomplete = (job: Job) =>
  !job.summary && job.keywords.length === 0;

const RightPanel = ({ job }: { job: Job }) => {
  if (job.status === "draft") {
    return <DraftPanel job={job} />;
  }

  if (job.status === "refining" && isExtractionIncomplete(job)) {
    return <FailedExtractionPanel job={job} />;
  }

  switch (job.status) {
    case "refining":
      return <RefiningPanel job={job} />;
    case "matching":
      return <MatchingPanel />;
    case "ready":
      return <ReadyPanel job={job} />;
    default:
      return <MatchingPanel />;
  }
};
