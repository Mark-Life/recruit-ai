import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="max-h-svh overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  </TooltipProvider>
);

export default DashboardLayout;
