import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { queryClient } from "@/state/query";
import { ThemeProvider } from "@/shell/theme-provider";
import { TooltipProvider } from "@/ui/shadcn/tooltip";
import { Toaster } from "@/ui/shadcn/sonner";
import { ClientProvider, useClient } from "@/features/clients/ClientContext";
import { ReportProvider } from "@/features/audit/ReportContext";

// Remount ReportProvider on client change so its seeded engagement state and
// remembered report reset to the newly selected client (no cross-client bleed).
function ReportScope({ children }: { children: React.ReactNode }) {
  const { selectedClientId } = useClient();
  return <ReportProvider key={selectedClientId}>{children}</ReportProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          {/* ClientProvider + ReportProvider both read the URL, so both live
              inside HashRouter. Client resolves first (?client=), then report
              within it (?report=). HashRouter lets the build run from file://. */}
          <HashRouter>
            <ClientProvider>
              <ReportScope>{children}</ReportScope>
            </ClientProvider>
          </HashRouter>
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
