"use client";

import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Suspense, use } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PageHeader } from "@/components/page-header";
import type { Talent } from "@/lib/api";
import { useTalent } from "@/lib/api";
import { ResumeTextPanel } from "../resume-text-panel";
import { TalentPipelineSteps } from "../talent-pipeline-steps";
import { DraftPanel } from "./draft-panel";
import { FailedExtractionPanel } from "./failed-extraction-panel";
import { MatchedPanel } from "./matched-panel";
import { ReviewingPanel } from "./reviewing-panel";

type Params = Promise<{ id: string }>;

export default function TalentDetailPage({ params }: { params: Params }) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Talent" />
          <LoadingSpinner />
        </>
      }
    >
      <TalentDetailContent id={id} />
    </Suspense>
  );
}

const TalentDetailContent = ({ id }: { id: string }) => {
  const { data: talent } = useTalent(id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        action={<TalentPipelineSteps status={talent.status} />}
        title={talent.name}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 border-b lg:w-2/5 lg:border-r lg:border-b-0">
          <ScrollArea className="h-full">
            <div className="p-5">
              <ResumeTextPanel talent={talent} />
            </div>
          </ScrollArea>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <RightPanel talent={talent} />
        </div>
      </div>
    </div>
  );
};

/** Extraction is considered incomplete when no keywords were extracted */
const isExtractionIncomplete = (talent: Talent) => talent.keywords.length === 0;

const RightPanel = ({ talent }: { talent: Talent }) => {
  if (talent.status === "uploaded") {
    return <DraftPanel talent={talent} />;
  }

  if (talent.status === "extracting" && isExtractionIncomplete(talent)) {
    return <FailedExtractionPanel talent={talent} />;
  }

  switch (talent.status) {
    case "extracting":
    case "reviewing":
      return <ReviewingPanel talent={talent} />;
    case "matched":
      return <MatchedPanel talent={talent} />;
    default:
      return <DraftPanel talent={talent} />;
  }
};
