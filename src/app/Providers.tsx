import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { queryClient } from "@/state/query";
import { ThemeProvider } from "@/shell/theme-provider";
import { TooltipProvider } from "@/ui/shadcn/tooltip";
import { Toaster } from "@/ui/shadcn/sonner";
import { ReportProvider } from "@/features/audit/ReportContext";
import { ClientProvider, useClient } from "@/features/clients/ClientContext";

// Re-key ReportProvider by the selected client so that switching clients
// remounts the report layer with a fresh engagement seed — no engagement state
// ever leaks across clients.
function ClientScopedReports({ children }: { children: React.ReactNode }) {
  const { selectedClientId } = useClient();
  return <ReportProvider key={selectedClientId}>{children}</ReportProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          {/* ClientProvider + ReportProvider live INSIDE HashRouter — they read
              ?client= / ?report= from the URL so the selection is shareable +
              survives back/fwd. Client resolves first (it picks the report set),
              then ReportProvider runs scoped to that client.
              HashRouter allows the build to run by double-clicking index.html
              without needing a server (file:// protocol works). */}
          <HashRouter>
            <ClientProvider>
              <ClientScopedReports>{children}</ClientScopedReports>
            </ClientProvider>
          </HashRouter>
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
