import { create } from "zustand";

// Cross-component UI state. Never persisted (theme is the documented exception
// and lives in the ThemeProvider).

interface UIState {
  sidebarCollapsed: boolean;
  // Mobile nav drawer (Sheet-based). Distinct from `sidebarCollapsed` which
  // is the desktop expand/collapse rail state. Below `lg` the desktop sidebar
  // is hidden entirely (hidden lg:flex) so this drives a slide-in drawer
  // from the TopBar hamburger.
  mobileNavOpen: boolean;
  drawerOpen: null | "commercial" | "prospectReview";
  drawerPayload: Record<string, unknown> | null;
  commandOpen: boolean;
  selectedLeadIds: string[];
  toggleSidebar: () => void;
  setMobileNavOpen: (v: boolean) => void;
  openDrawer: (kind: "commercial" | "prospectReview", payload?: Record<string, unknown>) => void;
  closeDrawer: () => void;
  setCommandOpen: (v: boolean) => void;
  toggleLeadSelection: (id: string) => void;
  selectAllLeads: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  drawerOpen: null,
  drawerPayload: null,
  commandOpen: false,
  selectedLeadIds: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  openDrawer: (kind, payload) => set({ drawerOpen: kind, drawerPayload: payload ?? null }),
  // closeDrawer keeps drawerPayload intact so the drawer component instance
  // stays mounted across close → reopen. Only the visibility flag flips.
  // useState / useRef inside the drawer therefore survive a close, and a
  // reopen for the same lead restores the BP's in-progress state instead
  // of a blank form. drawerPayload is replaced (not preserved) on the next
  // openDrawer call.
  closeDrawer: () => set({ drawerOpen: null }),
  setCommandOpen: (v) => set({ commandOpen: v }),
  toggleLeadSelection: (id) =>
    set((s) => ({
      selectedLeadIds: s.selectedLeadIds.includes(id)
        ? s.selectedLeadIds.filter((x) => x !== id)
        : [...s.selectedLeadIds, id],
    })),
  selectAllLeads: (ids) => set({ selectedLeadIds: ids }),
  clearSelection: () => set({ selectedLeadIds: [] }),
}));
