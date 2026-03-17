"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface CityOption {
  id: string;
  name: string;
  province: string;
}

export function useCities() {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<CityOption[]>("/locations/cities")
      .then((data) => setCities(data.map((c) => c.name).sort((a, b) => a.localeCompare("ar"))))
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  return { cities, loading };
}
