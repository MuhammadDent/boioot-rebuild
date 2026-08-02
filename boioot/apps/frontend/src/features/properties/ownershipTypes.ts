"use client";

/**
 * Single source of truth for ownership-type options on the frontend.
 *
 * Authoritative source: GET /api/ownership-types — the admin-managed,
 * database-backed lookup (OwnershipTypeConfigs). Admin additions, edits,
 * activation/deactivation and ordering automatically flow to every consumer
 * of this module (public creation wizard, dashboard edit form, details page).
 *
 * The hardcoded OWNERSHIP_TYPE_LABELS map in `constants.ts` is NOT
 * authoritative — it is kept only as an offline/API-failure/legacy fallback.
 *
 * Label resolution priority:
 *   1. matching API option (by stable code in `value`)
 *   2. legacy fallback map (OWNERSHIP_TYPE_LABELS)
 *   3. "غير محدد"
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { OwnershipTypeConfig } from "@/types";
import { OWNERSHIP_TYPE_LABELS } from "./constants";

/** Fallback label shown for null/empty/unknown values. */
export const OWNERSHIP_UNSPECIFIED_LABEL = "غير محدد";

/** Fetches the active, ordered ownership types from the authoritative API. */
export function fetchOwnershipTypes(): Promise<OwnershipTypeConfig[]> {
  return api.get<OwnershipTypeConfig[]>("/ownership-types");
}

export interface UseOwnershipTypesResult {
  /** Active, ordered options from the admin-managed database table. */
  options: OwnershipTypeConfig[];
  loading: boolean;
  /** True when the API call failed — consumers should show a safe fallback. */
  error: boolean;
}

/** Shared hook — one fetch implementation for wizard, edit form, and details. */
export function useOwnershipTypes(): UseOwnershipTypesResult {
  const [options, setOptions] = useState<OwnershipTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOwnershipTypes()
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading, error };
}

/**
 * Resolves the display label for a stored ownership code.
 * Priority: API option → legacy fallback map → "غير محدد".
 * Null/empty/unknown values always resolve to "غير محدد".
 */
export function resolveOwnershipLabel(
  value: string | null | undefined,
  options: OwnershipTypeConfig[]
): string {
  if (!value) return OWNERSHIP_UNSPECIFIED_LABEL;
  const match = options.find((o) => o.value === value);
  if (match) return match.label;
  return OWNERSHIP_TYPE_LABELS[value] ?? OWNERSHIP_UNSPECIFIED_LABEL;
}

/**
 * Builds the option list for an edit form.
 *
 * If the property's saved value is legacy/inactive/absent from the current
 * active API list, it is appended as a selectable entry so editing never
 * silently erases or replaces it (label resolved via the fallback map, or
 * the raw code if unknown). The saved value is never dropped.
 */
export function withSavedValue(
  options: OwnershipTypeConfig[],
  savedValue: string | null | undefined
): { value: string; label: string }[] {
  const list = options.map((o) => ({ value: o.value, label: o.label }));
  if (savedValue && !options.some((o) => o.value === savedValue)) {
    list.push({
      value: savedValue,
      label: OWNERSHIP_TYPE_LABELS[savedValue] ?? savedValue,
    });
  }
  return list;
}
