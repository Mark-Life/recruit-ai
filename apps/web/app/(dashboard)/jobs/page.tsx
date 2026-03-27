import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { PageHeader } from "@/components/page-header";
import { MOCK_JOBS } from "@/lib/mock-data";
import { JobCard } from "./job-card";
import { NewJobDialog } from "./new-job-dialog";

export default function JobsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader action={<NewJobDialog />} title="Jobs" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {MOCK_JOBS.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <p className="text-sm">No job descriptions yet.</p>
              <NewJobDialog />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {MOCK_JOBS.map((job) => (
                <JobCard job={job} key={job.id} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
