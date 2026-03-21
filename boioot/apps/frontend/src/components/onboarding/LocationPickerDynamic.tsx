"use client";

import dynamic from "next/dynamic";
import type { LatLng } from "./LocationPicker";
import Spinner from "@/components/ui/Spinner";

// Leaflet cannot render on the server — SSR must be disabled
const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div style={{
      height: 290,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-surface)",
      borderRadius: 8,
      border: "1px solid var(--color-border)",
    }}>
      <Spinner />
    </div>
  ),
});

export type { LatLng };
export default LocationPicker;
