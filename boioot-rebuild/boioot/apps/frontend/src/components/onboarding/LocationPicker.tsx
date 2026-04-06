"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon paths broken by webpack/Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface LatLng { lat: number; lng: number }

interface Props {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
}

// Syria center — Damascus
const DAMASCUS: [number, number] = [33.5102, 36.2913];

// Inner handler — listens for map click
function ClickHandler({ onChange }: { onChange: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Re-centres the map when a pre-existing value is loaded
function FlyTo({ target }: { target: LatLng | null }) {
  const map = useMap();
  const initialised = useRef(false);

  useEffect(() => {
    if (target && !initialised.current) {
      map.flyTo([target.lat, target.lng], 14, { duration: 1 });
      initialised.current = true;
    }
  }, [target, map]);

  return null;
}

export default function LocationPicker({ value, onChange }: Props) {
  const markerPos: [number, number] | null =
    value ? [value.lat, value.lng] : null;

  return (
    <MapContainer
      center={DAMASCUS}
      zoom={11}
      style={{
        height: 290,
        width: "100%",
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        cursor: "crosshair",
      }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <ClickHandler onChange={onChange} />
      <FlyTo target={value} />

      {markerPos && (
        <Marker
          position={markerPos}
          draggable
          eventHandlers={{
            dragend(e) {
              const pos = (e.target as L.Marker).getLatLng();
              onChange({ lat: pos.lat, lng: pos.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
