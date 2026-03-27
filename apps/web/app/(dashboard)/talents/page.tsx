import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { MapPinIcon, MonitorIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MOCK_TALENTS } from "@/lib/mock-data";

export default function TalentsPage() {
  return (
    <>
      <PageHeader title="Talent Pool" />
      <div className="p-4">
        <div className="flex flex-col gap-3">
          {MOCK_TALENTS.map((talent) => (
            <Card key={talent.id} size="sm">
              <CardHeader>
                <CardTitle>{talent.name}</CardTitle>
                <CardDescription>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{talent.title}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="size-3.5" />
                      {talent.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MonitorIcon className="size-3.5" />
                      {talent.workModes.join(" / ")}
                    </span>
                    <span>{talent.experienceYears} yrs</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {talent.skills.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
