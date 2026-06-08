import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

/**
 * POPOVER — GAS canonical popover surface (filter pickers, info popovers,
 * "more filters" panels). Same elevated white surface vocabulary as Menu /
 * Select for visual coherence.
 *
 * Composition mirrors Menu — pass `trigger` and arbitrary `children`.
 */

interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  /** Width in px; defaults auto-fit. */
  width?: number;
  className?: string;
}

export function Popover({
  trigger, children, align = "start", side = "bottom", width, className,
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          side={side}
          sideOffset={8}
          collisionPadding={12}
          style={width ? { width } : undefined}
          className={cn(
            "z-[60] overflow-hidden rounded-xl p-3",
            "bg-white ring-1 ring-slate-200/80",
            "shadow-[0_18px_48px_-12px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.08)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[state=open]:duration-150 data-[state=closed]:duration-100",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
            // Reduced-motion bailout — surface still appears, just without
            // the scale/slide flourish. Keeps a11y promises consistent
            // across Menu / Popover / Select.
            "motion-reduce:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
