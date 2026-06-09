import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { queryClient } from "@/state/query";
import { ThemeProvider } from "@/shell/theme-provider";
import { TooltipProvider } from "@/ui/shadcn/tooltip";
import { Toaster } from "@/ui/shadcn/sonner";
import { useAuthStore } from "@/state/authStore";

export function Providers({ children }: { children: React.ReactNode }) {
  // Restore the session once on boot so a refresh keeps a signed-in user signed
  // in. In mock mode getSession() returns the open session (harmless); in bff
  // mode it reads the backend cookie.
  React.useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          {/* The Client/Report data providers do NOT live here — they wrap only
              the authenticated routes (see Router), so public routes (login,
              magic-link verify) render without an authenticated data fetch. */}
          <HashRouter>{children}</HashRouter>
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
