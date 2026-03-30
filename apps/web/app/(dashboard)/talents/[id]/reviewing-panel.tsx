"use client";

import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Talent } from "@/lib/api";
import { useConfirmKeywords } from "@/lib/api";
import { EditableKeywords } from "../editable-keywords";
import { ProfileMeta } from "../profile-meta";

/** Reviewing state — extracted profile with editable keywords */
export const ReviewingPanel = ({ talent }: { talent: Talent }) => {
  const router = useRouter();
  const [keywords, setKeywords] = useState<readonly string[]>(talent.keywords);
  const confirmKeywords = useConfirmKeywords(talent.id);

  const handleConfirm = () => {
    confirmKeywords.mutate([...keywords], {
      onSuccess: () => {
        router.push(`/talents/${talent.id}`);
      },
    });
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-base">Extracted Profile</h3>
          <p className="text-muted-foreground text-sm">
            Review the extracted profile and adjust keywords before matching.
          </p>
        </div>
        <Badge variant="outline">
          <PencilIcon className="mr-1 size-3" />
          {keywords.length} keywords
        </Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 p-5">
          <ProfileMeta
            experienceYears={talent.experienceYears}
            location={talent.location}
            name={talent.name}
            title={talent.title}
            workModes={talent.workModes}
          />

          <EditableKeywords
            actionLabel="Confirm & Match"
            actionPending={confirmKeywords.isPending}
            actionPendingLabel="Matching..."
            keywords={keywords}
            onAction={handleConfirm}
            setKeywords={setKeywords}
          />
        </div>
      </ScrollArea>
    </>
  );
};
