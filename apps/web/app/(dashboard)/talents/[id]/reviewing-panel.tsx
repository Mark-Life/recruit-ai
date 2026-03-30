"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Talent } from "@/lib/api";
import { useConfirmKeywords } from "@/lib/api";
import { EditableKeywords } from "../editable-keywords";
import { ProfileMeta } from "../profile-meta";
import { EditTalentSheet } from "./edit-talent-sheet";

/** Reviewing state — extracted profile with editable keywords */
export const ReviewingPanel = ({ talent }: { talent: Talent }) => {
  const router = useRouter();
  const [keywords, setKeywords] = useState<readonly string[]>(talent.keywords);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setKeywords(talent.keywords);
  }, [talent.keywords]);
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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setEditOpen(true)}
            size="icon-sm"
            variant="ghost"
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Badge variant="outline">{keywords.length} keywords</Badge>
        </div>
      </div>

      <EditTalentSheet
        onOpenChange={setEditOpen}
        open={editOpen}
        talent={talent}
      />

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
