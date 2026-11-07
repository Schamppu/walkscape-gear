import { describe, it, expect } from "vitest";
import { filterServices, sortServicesByTier } from "@/domain/services/services";
import type { ServiceRequirement } from "@/domain/services/services";
import type { ServiceDetail } from "@/domain/types/service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService(
  id: string,
  tier: string,
  keywords: string[] = [],
  name = id,
): ServiceDetail {
  return {
    id,
    name,
    icon: "",
    tier,
    serviceType: "crafting",
    keywords,
    relatedSkills: [],
    requirements: [],
    attributes: [],
  };
}

// ---------------------------------------------------------------------------
// filterServices
// ---------------------------------------------------------------------------

describe("filterServices", () => {
  const basic = makeService("s1", "basic", ["kitchen"]);
  const advanced = makeService("s2", "advanced", ["kitchen"]);
  const expert = makeService("s3", "expert", ["loom"]);

  it("returns all services when tier requirement is 'basic' (lowest)", () => {
    const req: ServiceRequirement = { tier: "basic" };
    expect(filterServices([basic, advanced, expert], req)).toHaveLength(3);
  });

  it("filters out services below the required tier", () => {
    const req: ServiceRequirement = { tier: "advanced" };
    const result = filterServices([basic, advanced, expert], req);
    expect(result.map((s) => s.id)).not.toContain("s1");
    expect(result.map((s) => s.id)).toContain("s2");
    expect(result.map((s) => s.id)).toContain("s3");
  });

  it("returns only expert-tier services when requirement is 'expert'", () => {
    const req: ServiceRequirement = { tier: "expert" };
    const result = filterServices([basic, advanced, expert], req);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s3");
  });

  it("filters by serviceKeyword", () => {
    const req: ServiceRequirement = {
      tier: "basic",
      serviceKeyword: "kitchen",
    };
    const result = filterServices([basic, advanced, expert], req);
    expect(result.map((s) => s.id)).toContain("s1");
    expect(result.map((s) => s.id)).toContain("s2");
    expect(result.map((s) => s.id)).not.toContain("s3");
  });

  it("filters by multiple keywords — ALL must match", () => {
    const both = makeService("both", "basic", ["kitchen", "spectral"]);
    const partial = makeService("partial", "basic", ["kitchen"]);
    const req: ServiceRequirement = {
      tier: "basic",
      keywords: ["kitchen", "spectral"],
    };
    const result = filterServices([both, partial], req);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("both");
  });

  it("combines keywords and serviceKeyword (all must match)", () => {
    const full = makeService("full", "basic", [
      "kitchen",
      "spectral",
      "underwater",
    ]);
    const partial = makeService("partial", "basic", ["kitchen", "spectral"]);
    const req: ServiceRequirement = {
      tier: "basic",
      keywords: ["kitchen", "spectral"],
      serviceKeyword: "underwater",
    };
    const result = filterServices([full, partial], req);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("full");
  });

  it("returns empty array when no services match", () => {
    const req: ServiceRequirement = {
      tier: "expert",
      serviceKeyword: "kitchen",
    };
    expect(filterServices([basic, advanced, expert], req)).toHaveLength(0);
  });

  it("applies only tier check when keywords array is empty", () => {
    const req: ServiceRequirement = { tier: "basic", keywords: [] };
    expect(filterServices([basic, advanced], req)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// sortServicesByTier
// ---------------------------------------------------------------------------

describe("sortServicesByTier", () => {
  it("sorts basic before advanced before expert", () => {
    const services = [
      makeService("s3", "expert"),
      makeService("s1", "basic"),
      makeService("s2", "advanced"),
    ];
    const result = [...services].sort(sortServicesByTier).map((s) => s.id);
    expect(result).toEqual(["s1", "s2", "s3"]);
  });

  it("sorts alphabetically by name within the same tier", () => {
    const services = [
      makeService("c", "advanced", [], "Crafting"),
      makeService("b", "basic", [], "Smithing"),
      makeService("a", "basic", [], "Tinkering"),
    ];
    const result = [...services].sort(sortServicesByTier).map((s) => s.name);
    expect(result).toEqual(["Smithing", "Tinkering", "Crafting"]);
  });

  it("keeps a list already in order unchanged", () => {
    const services = [
      makeService("a", "basic", [], "A"),
      makeService("b", "advanced", [], "B"),
      makeService("c", "expert", [], "C"),
    ];
    const result = [...services].sort(sortServicesByTier).map((s) => s.id);
    expect(result).toEqual(["a", "b", "c"]);
  });
});
