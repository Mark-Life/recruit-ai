import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <h1 className="font-semibold text-base">{title}</h1>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  );
}
