import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Tokens are the source of truth. Tailwind extends from them.
// Hex colours live alongside CSS vars so the index.css theme layer works.

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  prefix: "",
  theme: {
    container: { center: true, padding: "1.25rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        // GAS tokens
        gas: {
          accent: "#6D28D9",
          accentHover: "#5B21B6",
          accentSoft: "#F5EEFF",
          accentRing: "#E2D5FB",
          success: "#0E7F5F",
          successHover: "#0B6A50",
          successSoft: "#E8FBF2",
          successRing: "#B7E6CD",
        },
        status: {
          captured: "#64748B",
          qualified: "#4F46E5",
          proposalOut: "#F59E0B",
          signed: "#0E7F5F",
          provisioning: "#7C3AED",
          active: "#334155",
          stale: "#F43F5E",
          blocked: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Inter Tight"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      // GAS TYPOGRAPHY SYSTEM — canonical tokens.  Every route uses these
      // names; arbitrary `text-[Npx]` values are forbidden outside these
      // tokens so scale drift cannot occur.
      //
      //   display  — page title (h1)
      //   section  — card / section title (h3)
      //   kpi      — hero number on StatTile
      //   body     — default paragraph / metadata
      //   support  — sub-label, row metadata, compact helper text
      //   caption  — chip / small label
      //   overline — uppercase category label
      fontSize: {
        display:  ["22px",   { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.01em" }],
        section:  ["13.5px", { lineHeight: "1.3", fontWeight: "600" }],
        kpi:      ["26px",   { lineHeight: "1",   fontWeight: "700", letterSpacing: "-0.02em" }],
        body:     ["13px",   { lineHeight: "1.5" }],
        support:  ["12px",   { lineHeight: "1.4" }],
        caption:  ["11.5px", { lineHeight: "1.4" }],
        overline: ["10.5px", { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      borderRadius: {
        lg: "calc(var(--radius) + 2px)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 2px)",
      },
      // Soft, layered shadows — used by .gas-card and primary surfaces to
      // give every Card a real sense of elevation without being heavy.
      // Two-stop shadows mimic ambient + key light for a more natural look.
      boxShadow: {
        // tile: exact match for mock .st box-shadow (StatTile surfaces).
        tile:         "0 1px 2px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        // card: mock .card box-shadow (Card component, slightly lighter).
        card:         "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
        "card-hover": "0 2px 4px rgba(15,23,42,0.06), 0 12px 28px -8px rgba(15,23,42,0.14)",
        "soft-lg":    "0 8px 32px -12px rgba(15,23,42,0.18)",
        "topbar":     "0 1px 0 rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.04)",
        "violet-glow":"0 0 0 6px rgba(124,58,237,0.08)",
        "inner-top":  "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      transitionTimingFunction: {
        "out-expo":  "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-cubic": "cubic-bezier(0.33, 1, 0.68, 1)",
      },
      // Custom duration tokens used by PageTransition, dialog, dashboard
      // crossfade. Tailwind's default scale jumps 200 → 300, which is too
      // coarse for the 220 / 240ms beats this UI is tuned to. Without these
      // extensions those `duration-220` / `duration-240` classes silently
      // generate nothing.
      transitionDuration: {
        "220": "220ms",
        "240": "240ms",
      },
      animationDuration: {
        "220": "220ms",
        "240": "240ms",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in":        { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": {
          from: { transform: "translateX(12px)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to:   { transform: "translateY(0)",   opacity: "1" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Mobile-nav drawer animations. Lives in this config (not in
        // tailwindcss-animate's slide-in-from-left class) because the
        // plugin's keyframes were silently producing no visible motion
        // in this app's setup — the drawer rendered with transform:none
        // and stayed invisible (it had bg-card from the Sheet variant
        // overlapping bg-slate-950 in a way that resolved to a white
        // panel sitting on a near-white blurred page = completely
        // invisible). Naming them explicitly here gives us a known-good
        // animation pipeline we can verify by class name.
        "drawer-in": {
          from: { transform: "translateX(-100%)" },
          to:   { transform: "translateX(0)" },
        },
        "drawer-out": {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-100%)" },
        },
        "overlay-in":  { from: { opacity: "0" }, to: { opacity: "1" } },
        "overlay-out": { from: { opacity: "1" }, to: { opacity: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.18s ease-out",
        "accordion-up":   "accordion-up 0.18s ease-out",
        "fade-in":        "fade-in 150ms ease-out",
        "slide-in-right": "slide-in-right 240ms cubic-bezier(0,0,0,1)",
        "slide-up":       "slide-up 150ms ease-out",
        "shimmer":        "shimmer 2.6s linear infinite",
        "drawer-in":      "drawer-in 280ms cubic-bezier(0.16, 1, 0.3, 1)",
        "drawer-out":     "drawer-out 220ms cubic-bezier(0.7, 0, 0.84, 0)",
        "overlay-in":     "overlay-in 220ms ease-out",
        "overlay-out":    "overlay-out 180ms ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
