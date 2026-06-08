import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PAGESTICKYHEADER — GAS canonical page-top band.
 *
 * SYSTEM LOCK (DO NOT BYPASS):
 *   • EVERY route that owns a page title MUST render it inside
 *     <PageStickyHeader>. No route may hand-roll a sticky header div.
 *     (Settings, Login, and other single-column surfaces included.)
 *   • Visual contract (immutable):
 *        – sticky      top-0 z-20 (under TopBar z-30)
 *        – gutter      -mx-6 px-6 (breakout of <main>'s px-6)
 *        – surface     bg-white/95 backdrop-blur-xl
 *        – divider     border-b border-slate-200
 *        – vertical    py-3
 *   • The `className` prop extends only — it MAY NOT override gutter,
 *     z-layer, backdrop, or divider.
 *
 * Encapsulates shell-padding knowledge: <main> has px-6, and a page-root
 * sticky band must break out of it (`-mx-6 px-6`) to span the full content
 * width. Keeping that breakout HERE means routes do not need to know how
 * <main> is padded — if the shell gutter ever changes, both values move
 * together in the shell layer.
 *
 * For feature-scoped sticky bands that live inside a bounded container
 * (e.g. PipelineToolbar inside <Card>), keep sticky behavior scoped to
 * that feature component — containment rules differ.
 */
export function PageStickyHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        // Glass surface — saturated backdrop blur + soft shadow rather than
        // a hard border. Reads as a layered, premium header that floats
        // above page content as the user scrolls.
        "md:sticky md:top-0 z-20 -mx-6 px-6 py-3.5",
        // Solid white — matches mock .lh { background: #fff }.
        // NO opacity, NO backdrop-blur, NO shadow. Semi-transparent
        // bg-white/85 was making content bleed through and tinting the
        // band; the mock uses a plain solid surface.
        "bg-white",
        "border-b border-[#E2E8F0]",
        "will-change-transform [transform:translateZ(0)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
