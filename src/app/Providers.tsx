import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { queryClient } from "@/state/query";
import { ThemeProvider } from "@/shell/theme-provider";
import { TooltipProvider } from "@/ui/shadcn/tooltip";
import { Toaster } from "@/ui/shadcn/sonner";
import { ReportProvider } from "@/features/audit/ReportContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          {/* ReportProvider lives INSIDE HashRouter — it reads ?report= from
              the URL so the selected report is shareable + survives back/fwd.
              HashRouter allows the build to run by double-clicking index.html
              without needing a server (file:// protocol works). */}
          <HashRouter>
            <ReportProvider>{children}</ReportProvider>
          </HashRouter>
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
