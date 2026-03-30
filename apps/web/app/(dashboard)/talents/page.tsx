"use client";

import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { PageHeader } from "@/components/page-header";
import { useTalents } from "@/lib/api";
import { TalentCard } from "./talent-card";

const NewTalentButton = () => (
  <Button asChild size="sm">
    <Link href="/talents/new">
      <PlusIcon className="size-4" />
      New Talent
    </Link>
  </Button>
);

const TalentList = () => {
  const { data: talents } = useTalents();

  if (talents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <p className="text-sm">No talents yet.</p>
        <NewTalentButton />
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
};

const TalentsPage = () => (
  <div className="flex min-h-0 flex-1 flex-col">
    <PageHeader action={<NewTalentButton />} title="Talent Pool" />
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-4">
        <Suspense fallback={<LoadingSpinner label="Loading talents..." />}>
          <TalentList />
        </Suspense>
      </div>
    </ScrollArea>
  </div>
);

export default TalentsPage;
