"use client";

import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PageHeader } from "@/components/page-header";
import { useTalents } from "@/lib/api";
import { NewTalentDialog } from "./new-talent-dialog";
import { TalentCard } from "./talent-card";

function TalentList() {
  const { data: talents } = useTalents();

  if (talents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <p className="text-sm">No talents yet.</p>
        <NewTalentDialog />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {talents.map((talent) => (
        <TalentCard key={talent.id} talent={talent} />
      ))}
    </div>
  );
}

export default function TalentsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader action={<NewTalentDialog />} title="Talent Pool" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <Suspense fallback={<LoadingSpinner label="Loading talents..." />}>
            <TalentList />
          </Suspense>
        </div>
      </ScrollArea>
    </div>
  );
}
