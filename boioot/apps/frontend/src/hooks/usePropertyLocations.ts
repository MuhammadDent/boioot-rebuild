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

/**
 * Fetches ALL distinct province / city / neighborhood values that appear in
 * the Properties dataset (single request on mount).  Client-side filtering is
 * then applied based on the selected province and city.
 */
export function usePropertyLocations(selectedProvince?: string, selectedCity?: string) {
  const [raw, setRaw] = useState<RawOptions>({ provinces: [], cities: [], neighborhoods: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<RawOptions>("/locations/property-options")
      .then((d) => setRaw(d))
      .catch(() => setRaw({ provinces: [], cities: [], neighborhoods: [] }))
      .finally(() => setLoading(false));
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
