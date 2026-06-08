import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SECTIONHEADER — GAS canonical card header (.ch pattern).
 *
 * SYSTEM LOCK (DO NOT BYPASS):
 *   • Every feature card / settings card inside a page body MUST use
 *     <SectionHeader> for its title band. Pages MUST NOT hand-roll
 *     "h3 + p + action" title rows.
 *   • Use <PageStickyHeader> (shell) for page-level titles — NOT
 *     <SectionHeader>. SectionHeader is strictly the inside-of-Card
 *     header.
 *
 * VISUAL CONTRACT (mock .ch):
 *   Negative-margin escape: -mx-[18px] -mt-4 breaks out of Card's
 *   "md" padding (py-4 px-[18px]) so this band sits flush against
 *   the card's rounded edges — exactly as mock .ch sits at the top
 *   of .card. mb-4 restores the 16px gap between the header border
 *   and the card body content that follows.
 *
 *   Rendering order locked:
 *     padding     13px top / 11px bottom / 18px horizontal (.ch)
 *     border-b    1px solid rgba(226,232,240,0.7)
 *     background  linear-gradient(to bottom, #fafbfd 0%, #ffffff 100%)
 *     icon        28×28px, 6px radius, violet-gradient, white svg (.ch-ico.v)
 *     title       Inter Tight 13px / 700 / tracking-[-0.015em] (.ch-t)
 *     subtitle    11px / slate-500 / margin-top 1px (.ch-d)
 */

interface Props {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ icon, title, subtitle, action, className }: Props) {
  return (
    // ── Escape card's py-4 px-[18px] ("md") padding ──────────────────
    // -mx-[18px]: grow left+right flush with card edges (card clips at radius)
    // -mt-4:      pull up to sit at card top border (card has overflow-hidden)
    // mb-4:       restore 16px gap between header border-b and card body
    // Own padding matches mock .ch: pt-[13px] pb-[11px] px-[18px]
    <div
      className={cn(
        "-mx-[18px] -mt-4 mb-4",
        "flex items-center justify-between gap-[10px]",
        "px-[18px] pt-[13px] pb-[11px]",
        "border-b border-slate-200/70",
        "bg-gradient-to-b from-[#fafbfd] to-white",
        className,
      )}
    >
      {/* .ch-l — left group: icon + title/subtitle */}
      <div className="flex items-center gap-[9px] min-w-0">

        {icon && (
          // .ch-ico.v — 28×28px, 6px radius.
          // Violet gradient (matches mock .ch-ico.v exactly).
          // Shadow: 0 2px 8px rgba(109,40,217,0.28).
          // Child svg is sized by the caller — [&>*] forces 13×13px.
          <div
            className="h-7 w-7 shrink-0 rounded-[6px] flex items-center justify-center text-white [&>*]:h-[13px] [&>*]:w-[13px]"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 2px 8px rgba(109,40,217,0.28)",
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}

        <div className="min-w-0">
          {/* .ch-t — Inter Tight 13px / 700 / tracking-[-0.015em] / color var(--t9) */}
          <div className="font-display text-[13px] font-bold tracking-[-0.015em] text-[#0F172A] leading-none truncate">
            {title}
          </div>
          {subtitle && (
            // .ch-d — 11px / color var(--t5) / margin-top: 1px
            <div className="text-[11px] text-[#64748B] mt-px leading-tight truncate">
              {subtitle}
            </div>
          )}
        </div>

      </div>

      {/* .ch-r — right-aligned action slot */}
      {action && (
        <div className="shrink-0 flex items-center gap-[7px]">
          {action}
        </div>
      )}
    </div>
  );
}
