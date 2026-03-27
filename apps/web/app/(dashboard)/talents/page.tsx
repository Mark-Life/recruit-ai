import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { PageHeader } from "@/components/page-header";
import { MOCK_TALENTS } from "@/lib/mock-data";
import { NewTalentDialog } from "./new-talent-dialog";
import { TalentCard } from "./talent-card";

export default function TalentsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader action={<NewTalentDialog />} title="Talent Pool" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {MOCK_TALENTS.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <p className="text-sm">No talents yet.</p>
              <NewTalentDialog />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {MOCK_TALENTS.map((talent) => (
                <TalentCard key={talent.id} talent={talent} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
