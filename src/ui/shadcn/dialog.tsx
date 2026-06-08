import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

// NOTE — Ghost-dialog fix.
//
// Symptom (pre-fix): closing a dialog (Cancel, X, ESC, or
// onOpenChange(false) from a parent) flipped data-state to "closed"
// but the element stayed in the DOM with display: grid + opacity: 1.
// Diagnostic showed the close `exit` animation registered with
// duration 150ms and ran to completion, but Radix's Presence listener
// never received `animationend` (likely a project-specific
// interaction between Strict Mode + Portal + the long animation
// class chain).
//
// Fix: keep the open animation (smooth fade-in + zoom) but DROP the
// close animation entirely. With no `animate-out` class the computed
// `animation-name` on the closing element is "none", and Radix's
// Presence drops the `animationend` wait and unmounts immediately.
// The visual cost is a snap-close instead of a fade-out — accepted
// trade-off for reliable unmount across every dialog consumer.

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Layered glass: subtle slate veil + a soft tinted backdrop blur for
      // depth. Open transition lengthened to 220ms so the dialog doesn't
      // appear to "pop" — backdrop and content rise together.
      "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md backdrop-saturate-150",
      "data-[state=open]:duration-220 data-[state=open]:animate-in data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Surface vocabulary aligned with Menu / Select / Popover —
        // rounded-2xl, ring-1 slate-200, layered shadow including a soft
        // violet glow so dialogs feel like an extension of the brand
        // surface, not generic shadcn modals. Open transition: fade in,
        // scale 95 → 100, slide up 6px, all over 240ms with ease-out-expo.
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        "gap-4 p-6 rounded-2xl",
        "bg-white ring-1 ring-slate-200/80",
        "shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35),0_8px_24px_-8px_rgba(124,58,237,0.18),0_0_0_1px_rgba(15,23,42,0.04)]",
        // Open animation only — close is intentionally a snap (see ghost-
        // dialog NOTE above).
        "data-[state=open]:animate-in",
        "data-[state=open]:fade-in-0",
        "data-[state=open]:zoom-in-95",
        "data-[state=open]:slide-in-from-bottom-2",
        "data-[state=open]:duration-240",
        // Tailwind animate's default timing is ease-out; we want a more
        // expressive cubic-bezier. Inline the keyframe-supported variant.
        "data-[state=open]:[animation-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        "motion-reduce:data-[state=open]:animate-none",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}