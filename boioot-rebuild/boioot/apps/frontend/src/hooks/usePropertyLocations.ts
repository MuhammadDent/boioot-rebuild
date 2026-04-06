"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

export interface LocationCity {
  name: string;
  province: string | null;
}

export interface LocationNeighborhood {
  name: string;
  city: string;
  province: string | null;
}

interface RawOptions {
  provinces: string[];
  cities: LocationCity[];
  neighborhoods: LocationNeighborhood[];
}

// ─── Module-level cache ───────────────────────────────────────────────────────
// property-options reflects the live Properties dataset. Caching is safe for
// the tab session — it changes only when listings are added/removed.

const _EMPTY: RawOptions = { provinces: [], cities: [], neighborhoods: [] };
let _cached: RawOptions | null = null;
let _inFlight: Promise<RawOptions> | null = null;

function fetchOptions(): Promise<RawOptions> {
  if (_cached) return Promise.resolve(_cached);
  if (_inFlight) return _inFlight;
  _inFlight = api
    .get<RawOptions>("/locations/property-options")
    .then((d) => { _cached = d; _inFlight = null; return d; })
    .catch(() => { _inFlight = null; return _EMPTY; });
  return _inFlight;
}

/**
 * Fetches ALL distinct province / city / neighborhood values that appear in
 * the Properties dataset (single request, cached for the tab session).
 * Client-side filtering is applied based on the selected province and city.
 */
export function usePropertyLocations(selectedProvince?: string, selectedCity?: string) {
  const [raw, setRaw] = useState<RawOptions>(() => _cached ?? _EMPTY);
  const [loading, setLoading] = useState(() => _cached === null);

  useEffect(() => {
    if (_cached) { setRaw(_cached); setLoading(false); return; }
    fetchOptions().then((d) => { setRaw(d); setLoading(false); });
  }, []);

  const cities = useMemo(() => {
    const list = selectedProvince
      ? raw.cities.filter((c) => c.province === selectedProvince)
      : raw.cities;
    // Deduplicate by name (same city may appear with different province values)
    const seen = new Set<string>();
    return list.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [raw.cities, selectedProvince]);

  const neighborhoods = useMemo(() => {
    if (!selectedCity && !selectedProvince) return raw.neighborhoods;
    if (selectedCity) return raw.neighborhoods.filter((n) => n.city === selectedCity);
    return raw.neighborhoods.filter((n) => n.province === selectedProvince);
  }, [raw.neighborhoods, selectedCity, selectedProvince]);

  return {
    provinces: raw.provinces,
    cities,
    neighborhoods,
    loading,
  };
}
