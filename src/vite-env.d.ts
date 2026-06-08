/// <reference types="vite/client" />

// Typed accessor for import.meta.env across the codebase. Vite reads
// VITE_-prefixed variables at build time and exposes them on
// import.meta.env. Without this reference, tsc reports
// "Property 'env' does not exist on type 'ImportMeta'" against the
// adapter selector, settings route, and ScenarioSwitcher.
//
// Add new VITE_-prefixed env vars here when they're introduced.
interface ImportMetaEnv {
  readonly VITE_ADAPTER?: "mock" | "bff";
  readonly VITE_PORTAL_BASE_URL?: string;
  readonly VITE_BFF_PORTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
