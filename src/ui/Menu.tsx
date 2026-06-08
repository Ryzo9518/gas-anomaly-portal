import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MENU — GAS canonical dropdown menu (action menus, bulk actions, "more").
 * Built on Radix DropdownMenu so it's accessible-by-construction.
 *
 * Visual contract — same surface vocabulary as Select / Popover:
 *   • Content: white, rounded-xl, ring-1 slate-200/80, layered soft shadow,
 *     Radix scale + slide animation.
 *   • Items: h-8 rounded-md, hover violet-50 + violet-900, danger items
 *     hover rose-50 + rose-900.
 *   • Sections separated by 1px slate-100, optional uppercase label.
 *
 * Composition:
 *   <Menu trigger={...}>
 *     <MenuLabel>...</MenuLabel>
 *     <MenuItem onSelect={...}>...</MenuItem>
 *     <MenuItem variant="danger" onSelect={...}>...</MenuItem>
 *     <MenuSeparator />
 *     <MenuCheckItem checked={...} onCheckedChange={...}>...</MenuCheckItem>
 *   </Menu>
 */

interface MenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  /** Min content width in px; defaults to 200. */
  minWidth?: number;
}

export function Menu({ trigger, children, align = "end", side = "bottom", minWidth = 200 }: MenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={12}
          style={{ minWidth }}
          className={cn(
            "z-[60] overflow-hidden rounded-xl p-1.5",
            "bg-white ring-1 ring-slate-200/80",
            "shadow-[0_18px_48px_-12px_rgba(15,23,42,0.18),0_4px_12px_-4px_rgba(15,23,42,0.08)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[state=open]:duration-150 data-[state=closed]:duration-100",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
            "data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
            "motion-reduce:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none",
          )}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

interface MenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  variant?: "default" | "danger";
  icon?: React.ReactNode;
  shortcut?: string;
}

export function MenuItem({ variant = "default", icon, shortcut, children, className, ...rest }: MenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "group flex items-center gap-2 h-8 px-2.5 rounded-md text-body cursor-pointer select-none outline-none",
        "transition-colors duration-100 motion-reduce:transition-none",
        variant === "default" && "text-slate-700 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-900",
        variant === "danger" && "text-rose-700 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-900",
        "data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed",
        className,
      )}
      {...rest}
    >
      {icon && (
        <span className={cn(
          "shrink-0 text-slate-400 transition-colors",
          variant === "default" && "group-data-[highlighted]:text-violet-600",
          variant === "danger" && "text-rose-400 group-data-[highlighted]:text-rose-600",
        )}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && (
        <span className="text-caption font-mono text-slate-400 group-data-[highlighted]:text-violet-700/70 ml-2">
          {shortcut}
        </span>
      )}
    </DropdownMenuPrimitive.Item>
  );
}

export function MenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "px-2.5 pt-1.5 pb-1 text-overline uppercase tracking-wide text-slate-400 select-none",
        className,
      )}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("my-1 h-px bg-slate-100", className)}
    />
  );
}

interface MenuCheckItemProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  children: React.ReactNode;
}

export function MenuCheckItem({ checked, onCheckedChange, children }: MenuCheckItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "group relative flex items-center gap-2 h-8 pl-7 pr-2.5 rounded-md text-body cursor-pointer select-none outline-none",
        "text-slate-700 data-[highlighted]:bg-violet-50 data-[highlighted]:text-violet-900",
        "transition-colors duration-100 motion-reduce:transition-none",
      )}
    >
      <DropdownMenuPrimitive.ItemIndicator className="absolute left-2 top-1/2 -translate-y-1/2 text-violet-600">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </DropdownMenuPrimitive.ItemIndicator>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}
