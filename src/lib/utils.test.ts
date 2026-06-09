import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

// Smoke test establishing the vitest toolchain (Unit 2). Real feature tests for
// the admin/client UIs land with Units 9/10.
describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toContain("a");
    expect(cn("a", "b")).toContain("b");
  });

  it("dedupes conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });
});
