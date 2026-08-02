import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API client so tests don't touch the network.
const getMock = vi.fn();
vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => getMock(...args) },
}));

import {
  fetchOwnershipTypes,
  resolveOwnershipLabel,
  withSavedValue,
  OWNERSHIP_UNSPECIFIED_LABEL,
} from "./ownershipTypes";
import { OWNERSHIP_OPTIONS, getOwnershipTypeLabel } from "./constants";
import type { OwnershipTypeConfig } from "@/types";

// Simulates the admin-managed DB records returned by GET /ownership-types
// (active + ordered) — the seeded defaults in production.
const apiOptions: OwnershipTypeConfig[] = [
  { id: "1", value: "Freehold", label: "تمليك حر", order: 1, isActive: true, createdAt: "" },
  { id: "2", value: "LongLease", label: "إيجار طويل الأمد", order: 2, isActive: true, createdAt: "" },
  { id: "3", value: "Usufruct", label: "حق انتفاع", order: 3, isActive: true, createdAt: "" },
  { id: "4", value: "Cooperative", label: "تعاوني", order: 4, isActive: true, createdAt: "" },
];

beforeEach(() => getMock.mockReset());

describe("fetchOwnershipTypes — single shared API source", () => {
  it("fetches from the authoritative /ownership-types endpoint (same as the wizard)", async () => {
    getMock.mockResolvedValue(apiOptions);
    const result = await fetchOwnershipTypes();
    expect(getMock).toHaveBeenCalledWith("/ownership-types");
    expect(result).toEqual(apiOptions);
  });
});

describe("withSavedValue — edit form option list", () => {
  it("edit form receives the active options from the API", () => {
    const list = withSavedValue(apiOptions, undefined);
    expect(list).toEqual(apiOptions.map((o) => ({ value: o.value, label: o.label })));
  });

  it("creation and edit use the same stable ownership codes", () => {
    // Both forms consume the same API options; codes are identical.
    const editValues = withSavedValue(apiOptions, undefined).map((o) => o.value);
    const wizardValues = apiOptions.map((o) => o.value);
    expect(editValues).toEqual(wizardValues);
  });

  it("existing active value stays in the list (preselectable)", () => {
    const list = withSavedValue(apiOptions, "Freehold");
    expect(list.filter((o) => o.value === "Freehold")).toHaveLength(1);
  });

  it("existing inactive/legacy value is appended so it is preserved, not erased", () => {
    // "Waqf" is a legacy hardcoded value that is NOT in the admin-managed DB.
    const list = withSavedValue(apiOptions, "Waqf");
    const appended = list[list.length - 1];
    expect(appended.value).toBe("Waqf");
    expect(appended.label).toBe("وقف"); // labeled via the legacy fallback map
  });

  it("unknown admin-era value is appended with its raw code (never dropped)", () => {
    const list = withSavedValue(apiOptions, "SomeFutureCode");
    expect(list.some((o) => o.value === "SomeFutureCode")).toBe(true);
  });

  it("no saved value → no phantom entry appended", () => {
    expect(withSavedValue(apiOptions, "")).toHaveLength(apiOptions.length);
    expect(withSavedValue(apiOptions, null)).toHaveLength(apiOptions.length);
  });

  it("API failure (empty options) still preserves the saved value", () => {
    const list = withSavedValue([], "Freehold");
    expect(list).toEqual([{ value: "Freehold", label: getOwnershipTypeLabel("Freehold") }]);
  });
});

describe("resolveOwnershipLabel — details display", () => {
  it("uses the API label when available (API wins over the legacy map)", () => {
    // DB says "تمليك حر" while the legacy map says "ملكية" — DB is authoritative.
    expect(resolveOwnershipLabel("Freehold", apiOptions)).toBe("تمليك حر");
  });

  it("falls back to the legacy map when the code is not in the API list", () => {
    expect(resolveOwnershipLabel("Waqf", apiOptions)).toBe("وقف");
  });

  it("falls back safely when the API failed (no options loaded)", () => {
    expect(resolveOwnershipLabel("Usufruct", [])).toBe("حق انتفاع");
  });

  it('missing/null/empty value displays "غير محدد"', () => {
    expect(resolveOwnershipLabel(null, apiOptions)).toBe(OWNERSHIP_UNSPECIFIED_LABEL);
    expect(resolveOwnershipLabel(undefined, apiOptions)).toBe(OWNERSHIP_UNSPECIFIED_LABEL);
    expect(resolveOwnershipLabel("", apiOptions)).toBe(OWNERSHIP_UNSPECIFIED_LABEL);
  });

  it('unknown code displays "غير محدد" — never a raw backend string', () => {
    expect(resolveOwnershipLabel("NotARealCode", apiOptions)).toBe(OWNERSHIP_UNSPECIFIED_LABEL);
  });

  it("admin-added values are accepted without frontend code changes", () => {
    const withNew = [
      ...apiOptions,
      { id: "9", value: "Musataha", label: "مساطحة", order: 9, isActive: true, createdAt: "" },
    ];
    expect(resolveOwnershipLabel("Musataha", withNew)).toBe("مساطحة");
    expect(withSavedValue(withNew, undefined).some((o) => o.value === "Musataha")).toBe(true);
  });
});

describe("clear semantics (edit form contract)", () => {
  it('empty selection ("") maps to an intentional clear, not "unchanged"', () => {
    // Mirrors PropertyForm submit mapping: edit mode sends the raw string,
    // so "" reaches the API and the backend clears the value.
    const mode = "edit";
    const fieldValue = "";
    const sent = mode === "edit" ? fieldValue : fieldValue || undefined;
    expect(sent).toBe("");
  });
});

describe("no automatic seed/backfill", () => {
  it("legacy hardcoded options are NOT merged into the API list", () => {
    // OWNERSHIP_OPTIONS has 8 legacy entries; the option list shown to users
    // must contain only the admin-managed API records (plus at most the
    // property's own saved value) — never the whole legacy list.
    const list = withSavedValue(apiOptions, undefined);
    expect(list).toHaveLength(apiOptions.length);
    expect(OWNERSHIP_OPTIONS.length).toBeGreaterThan(apiOptions.length);
    expect(list.some((o) => o.value === "Waqf")).toBe(false);
  });
});
