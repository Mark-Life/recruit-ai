"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

/** Editable keyword badges with add/remove and an action button */
export const EditableKeywords = ({
  keywords,
  setKeywords,
  actionLabel,
  actionPending = false,
  actionPendingLabel,
  onAction,
}: {
  keywords: readonly string[];
  setKeywords: (fn: (prev: readonly string[]) => readonly string[]) => void;
  actionLabel: string;
  actionPending?: boolean;
  actionPendingLabel?: string;
  onAction: () => void;
}) => {
  const [newKeyword, setNewKeyword] = useState("");

  const handleRemove = (keyword: string) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const handleAdd = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
      setNewKeyword("");
    }
  };

  const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Keywords
        </span>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Badge className="gap-1.5 pr-1.5" key={keyword} variant="secondary">
              {keyword}
              <button
                aria-label={`Remove ${keyword}`}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                onClick={() => handleRemove(keyword)}
                type="button"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Add Keyword
        </span>
        <div className="flex gap-2">
          <Input
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a keyword and press Enter..."
            value={newKeyword}
          />
          <Button
            disabled={!newKeyword.trim()}
            onClick={handleAdd}
            size="sm"
            variant="outline"
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button disabled={actionPending} onClick={onAction}>
          {actionPending ? (actionPendingLabel ?? actionLabel) : actionLabel}
        </Button>
      </div>
    </>
  );
};
