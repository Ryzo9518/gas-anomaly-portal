import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SELECT — GAS canonical select control. Replaces every native <select>.
 *
 * Visual contract:
 *   • Trigger reads as a peer of the Button system: rounded-lg, h-9, ring-1
 *     slate-200, hover:ring-slate-300, focus:ring-2 violet-500/30 + violet
 *     border. Chevron rotates 180° when open.
 *   • Content portal: white, rounded-lg, ring-1 slate-200/80, soft elevated
 *     shadow, brand-violet selected/highlight states. Smooth scale-in
 *     animation matching the rest of the system.
 *   • Items: h-8 rounded-md, slate-700 default, violet-50 + violet-700 on
 *     highlight, slate-900 + check icon on selected.
 *
 * Accessible-by-construction (Radix), keyboard-navigable, motion-reduce safe.
 */

interface SelectOption {
  value: string;
  label: string;
  /** Optional sub-label rendered to the right in muted slate. */
  hint?: string;
}

interface SelectProps {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  /** Optional leading icon node (lucide, sized 14px). */
  icon?: React.ReactNode;
  className?: string;
  /** Min width for the trigger surface. */
  minWidth?: number | string;
}

export function Select({
  value, onValueChange, options, placeholder, ariaLabel, icon,
  className, minWidth,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        style={minWidth ? { minWidth } : undefined}
        className={cn(
          "group inline-flex items-center justify-between gap-2 h-9 px-3 rounded-lg",
          "bg-white text-body text-slate-700 font-medium",
          "ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50",
          "data-[state=open]:ring-2 data-[state=open]:ring-violet-500/30 data-[state=open]:border-violet-400",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
          "transition-all duration-150 ease-out-expo motion-reduce:transition-none",
          "shrink-0",
          className,
        )}
      >
        {icon && <span className="text-slate-400 group-hover:text-slate-500 transition-colors shrink-0">{icon}</span>}
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "z-[60] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl",
            "bg-white ring-1 ring-slate-200/80",
            "shadow-[0_18px_48px_-12px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.08)]",
            // Smooth Radix-driven enter; exit kept short to feel snappy.
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[state=open]:duration-150 data-[state=closed]:duration-100",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
            "motion-reduce:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
          )}
        >
          <SelectPrimitive.Viewport className="p-1.5">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  "group relative flex items-center gap-2 h-8 pl-7 pr-2.5 rounded-md text-body",
                  "text-slate-700 cursor-pointer select-none outline-none",
                  "data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-900",
                  "data-[state=checked]:font-semibold data-[state=checked]:text-slate-900",
                  "transition-colors duration-100 motion-reduce:transition-none",
                )}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 top-1/2 -translate-y-1/2 text-violet-600">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                {opt.hint && (
                  <span className="ml-auto text-caption text-slate-400 group-data-[highlighted]:text-violet-700/70">
                    {opt.hint}
                  </span>
                )}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
