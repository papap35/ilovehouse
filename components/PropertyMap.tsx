"use client";

import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";

export interface DistrictMarker {
  city: string;
  district: string;
  lat: number;
  lng: number;
  sampleCount: number;
  avgUnitPricePerPing: number;
}

interface SearchCircle {
  center: [number, number];
  radiusKm: number;
}

interface Props {
  markers: DistrictMarker[];
  highlightedKeys?: Set<string>;
  circle?: SearchCircle | null;
  pickMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (marker: DistrictMarker) => void;
  center?: [number, number];
  zoom?: number;
}

const TAIWAN_CENTER: [number, number] = [23.7, 120.96];

function ClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 萬`;
  return n.toLocaleString();
}

function colorForPrice(price: number, min: number, max: number): string {
  if (max <= min) return "#2f8f6c";
  const ratio = (price - min) / (max - min);
  if (ratio < 0.34) return "#2f8f6c"; // 便宜：綠
  if (ratio < 0.67) return "#d97706"; // 中等：橘
  return "#dc2626"; // 昂貴：紅
}

export default function PropertyMap({
  markers,
  highlightedKeys,
  circle,
  pickMode = false,
  onMapClick,
  onMarkerClick,
  center = TAIWAN_CENTER,
  zoom = 8,
}: Props) {
  const { minPrice, maxPrice } = useMemo(() => {
    const prices = markers.map((m) => m.avgUnitPricePerPing).filter((p) => p > 0);
    return {
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    };
  }, [markers]);

  const maxCount = useMemo(
    () => Math.max(1, ...markers.map((m) => m.sampleCount)),
    [markers]
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 ${
        pickMode ? "cursor-crosshair" : ""
      }`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "420px", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler enabled={pickMode} onClick={onMapClick} />

        {circle && (
          <Circle
            center={circle.center}
            radius={circle.radiusKm * 1000}
            pathOptions={{ color: "#2f8f6c", fillColor: "#2f8f6c", fillOpacity: 0.08 }}
          />
        )}

        {markers.map((m) => {
          const key = `${m.city}::${m.district}`;
          const highlighted = !highlightedKeys || highlightedKeys.has(key);
          const radius = 6 + (m.sampleCount / maxCount) * 14;
          return (
            <CircleMarker
              key={key}
              center={[m.lat, m.lng]}
              radius={radius}
              pathOptions={{
                color: colorForPrice(m.avgUnitPricePerPing, minPrice, maxPrice),
                fillColor: colorForPrice(m.avgUnitPricePerPing, minPrice, maxPrice),
                fillOpacity: highlighted ? 0.6 : 0.15,
                opacity: highlighted ? 1 : 0.3,
              }}
              eventHandlers={{
                click: () => onMarkerClick?.(m),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">
                    {m.city} {m.district}
                  </div>
                  <div>樣本數：{m.sampleCount} 筆</div>
                  <div>平均單價／坪：{formatMoney(m.avgUnitPricePerPing)}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
