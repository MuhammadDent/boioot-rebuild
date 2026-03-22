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

export function useCities() {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<CityOption[]>("/locations/cities")
      .then((data) => {
        const seen = new Set<string>();
        const unique: string[] = [];
        data.forEach((c) => {
          const name = normalizeName(c.name);
          if (!name) return;
          const key = name;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(name);
          }
        });
        unique.sort((a, b) => a.localeCompare(b, "ar"));
        setCities(unique);
      })
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  return { cities, loading };
}
