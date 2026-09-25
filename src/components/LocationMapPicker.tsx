"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { reverseGeocode, type AddressSuggestion } from "@/lib/geocode";

type Props = {
  latitude: string;
  longitude: string;
  onPick: (suggestion: AddressSuggestion) => void;
};

export function LocationMapPicker({ latitude, longitude, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const lat = Number(latitude) || 52.52;
  const lng = Number(longitude) || 13.405;

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Fix default marker icons under bundlers.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current).setView([lat, lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      mapRef.current = map;
      markerRef.current = marker;

      async function applyLatLng(nextLat: number, nextLng: number) {
        marker.setLatLng([nextLat, nextLng]);
        const hit = await reverseGeocode(nextLat, nextLng);
        onPickRef.current(
          hit || {
            display: `${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}`,
            street: "",
            houseNumber: "",
            postalCode: "",
            city: "",
            latitude: nextLat.toFixed(6),
            longitude: nextLng.toFixed(6),
          },
        );
      }

      map.on("click", (e) => {
        void applyLatLng(e.latlng.lat, e.latlng.lng);
      });
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        void applyLatLng(pos.lat, pos.lng);
      });
    }

    void setup();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Initialize once; position updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng]);
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-line"
      />
      <p className="text-xs text-muted">
        Click the map or drag the pin to set the store location. Address fields update
        automatically; latitude and longitude stay read-only.
      </p>
    </div>
  );
}
