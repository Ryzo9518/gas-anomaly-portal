import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/ui/shadcn/command";
import { useUIStore } from "@/state/uiStore";
import { useReport } from "@/features/audit/ReportContext";

// Command palette — ⌘K / Ctrl+K. Phase 1 carries the route shortcuts
// only. Phase 2 can add server-side search (findings, inquiries, etc.)
// once the FastAPI backend lands.

export function CommandBar() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const navigate = useNavigate();
  const { linkWithReport } = useReport();

  // ⌘K / Ctrl+K toggles the palette
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const go = (to: string) => {
    setOpen(false);
    navigate(linkWithReport(to));
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a page…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => go("/dashboard")}>Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/upload")}>Upload Center</CommandItem>
          <CommandItem onSelect={() => go("/report")}>Audit Report</CommandItem>
          <CommandItem onSelect={() => go("/findings")}>Findings &amp; Roadmap</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
