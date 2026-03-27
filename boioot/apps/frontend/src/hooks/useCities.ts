"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface CityOption {
  id: string;
  name: string;
  province: string;
}

function normalizeName(name: string): string {
  return name.trim();
}

// ─── Module-level cache ───────────────────────────────────────────────────────
// All useCities() callers share a single in-flight promise and result.
// The cities list changes rarely — caching for the tab session is safe.

let _cachedCities: string[] | null = null;
let _inFlight: Promise<string[]> | null = null;

function fetchCities(): Promise<string[]> {
  if (_cachedCities !== null) return Promise.resolve(_cachedCities);
  if (_inFlight) return _inFlight;

  _inFlight = api
    .get<CityOption[]>("/locations/cities")
    .then((data) => {
      const seen = new Set<string>();
      const unique: string[] = [];
      data.forEach((c) => {
        const name = normalizeName(c.name);
        if (!name) return;
        if (!seen.has(name)) { seen.add(name); unique.push(name); }
      });
      unique.sort((a, b) => (a || "").localeCompare(b || "", "ar"));
      _cachedCities = unique;
      _inFlight = null;
      return unique;
    })
    .catch(() => {
      _inFlight = null;
      return [];
    });

  return _inFlight;
}

export function useCities() {
  const [cities, setCities] = useState<string[]>(() => _cachedCities ?? []);
  const [loading, setLoading] = useState(() => _cachedCities === null);

  useEffect(() => {
    if (_cachedCities !== null) {
      setCities(_cachedCities);
      setLoading(false);
      return;
    }
    fetchCities().then((result) => {
      setCities(result);
      setLoading(false);
    });
  }, []);

  return { cities, loading };
}
