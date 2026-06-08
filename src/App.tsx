import * as React from "react";
import { Providers } from "@/app/Providers";
import { Router } from "@/app/Router";
import { ErrorBoundary } from "@/shell/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <Router />
      </Providers>
    </ErrorBoundary>
  );
}
