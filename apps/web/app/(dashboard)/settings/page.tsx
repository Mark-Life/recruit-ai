import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <p className="text-sm">Settings will be available here.</p>
      </div>
    </>
  );
}
