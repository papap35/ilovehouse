"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { IndividualMarker } from "@/lib/geocode";

export interface DistrictMarker {
  city: string;
  district: string;
  lat: number;
  lng: number;
  sampleCount: number;
  avgUnitPricePerPing: number;
}

export interface HotZoneScoreMarker {
  city: string;
  district: string;
  score: number; // 0-100
}

export interface DevelopmentPlanMarker {
  id: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  type: string;
  stage: string;
  name: string;
  description: string;
}

// 跟 lib/geocode.ts 的 buildIndividualMarkers() 回傳型別共用同一個定義，
// 避免兩邊各自維護一份長得一樣、卻可能悄悄長歪（例如 dealType 沒有共用
// DealType）的型別。
export type IndividualPropertyMarker = IndividualMarker;

interface SearchCircle {
  center: [number, number];
  radiusKm: number;
}

export type ColorMode = "price" | "hotZone";

interface Props {
  markers: DistrictMarker[];
  individualMarkers?: IndividualPropertyMarker[];
  hotZoneScores?: HotZoneScoreMarker[];
  colorMode?: ColorMode;
  developmentPlans?: DevelopmentPlanMarker[];
  highlightedKeys?: Set<string>;
  circle?: SearchCircle | null;
  pickMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (marker: DistrictMarker) => void;
  center?: [number, number];
  zoom?: number;
}

const TAIWAN_CENTER: [number, number] = [23.7, 120.96];

const DEVELOPMENT_PLAN_ICON = L.divIcon({
  html: '<div style="font-size: 18px; line-height: 1;">🏗️</div>',
  className: "development-plan-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/**
 * 地圖的視角（center/zoom）原本是固定的，永遠顯示整個台灣，不會依搜尋
 * 結果調整。這在預設 zoom 下其實連整個台灣都放不下（北緯 22.6°~24.75°，
 * 台北市/新北市所在的北緯 25° 一帶整個在可視範圍外），篩選到任何比較北邊
 * 或南邊的縣市時，標記就會飄到看不見的地方，變成「查詢結果沒有顯示在
 * 地圖上」。改成標記變動時自動 fitBounds 到目前的標記範圍。
 */
function FitBoundsToMarkers({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [points, map]);
  return null;
}

const DEAL_TYPE_COLOR: Record<"buy" | "rent", string> = {
  buy: "#2563eb", // 買賣：藍
  rent: "#9333ea", // 租賃：紫
};

// 跟都市發展計畫標記一樣用 L.divIcon（純 HTML/CSS），不用需要外部圖片
// 資源的預設 Marker 圖示
const INDIVIDUAL_PROPERTY_ICONS: Record<"buy" | "rent", L.DivIcon> = {
  buy: L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${DEAL_TYPE_COLOR.buy};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>`,
    className: "individual-property-marker",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  }),
  rent: L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${DEAL_TYPE_COLOR.rent};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>`,
    className: "individual-property-marker",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  }),
};

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

// 用藍→橘→紅（而非均價用的綠→橘→紅），讓兩種上色模式一眼就能分辨
function colorForHotZone(score: number): string {
  if (score < 34) return "#2563eb"; // 冷：藍
  if (score < 67) return "#d97706"; // 中等：橘
  return "#dc2626"; // 熱：紅
}

export default function PropertyMap({
  markers,
  individualMarkers = [],
  hotZoneScores = [],
  colorMode = "price",
  developmentPlans = [],
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

  const hotZoneByDistrict = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of hotZoneScores) map.set(`${h.city}::${h.district}`, h.score);
    return map;
  }, [hotZoneScores]);

  const boundsPoints = useMemo((): [number, number][] => {
    if (individualMarkers.length > 0) {
      return individualMarkers.map((m): [number, number] => [m.lat, m.lng]);
    }
    return markers.map((m): [number, number] => [m.lat, m.lng]);
  }, [markers, individualMarkers]);

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
        <FitBoundsToMarkers points={boundsPoints} />

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
          const hotZoneScore = hotZoneByDistrict.get(key);
          const color =
            colorMode === "hotZone"
              ? colorForHotZone(hotZoneScore ?? 0)
              : colorForPrice(m.avgUnitPricePerPing, minPrice, maxPrice);
          const hasHotZoneData = colorMode !== "hotZone" || hotZoneScore !== undefined;

          return (
            <CircleMarker
              key={key}
              center={[m.lat, m.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: highlighted && hasHotZoneData ? 0.6 : 0.15,
                opacity: highlighted && hasHotZoneData ? 1 : 0.3,
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
                  {colorMode === "hotZone" && (
                    <div>
                      發展熱度：
                      {hotZoneScore !== undefined ? `${hotZoneScore} 分` : "資料不足，無法計算"}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {individualMarkers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={INDIVIDUAL_PROPERTY_ICONS[m.dealType]}>
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{m.address}</div>
                <div className="text-slate-500">
                  {m.city} {m.district}
                </div>
                <div className="mt-1">
                  {m.dealType === "buy" ? "買賣" : "租賃"} ・ {m.areaPing} 坪
                </div>
                <div>{formatMoney(m.totalPrice)}{m.dealType === "rent" ? " /月" : ""}（{formatMoney(m.unitPricePerPing)}/坪）</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {developmentPlans.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={DEVELOPMENT_PLAN_ICON}>
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{p.name}</div>
                <div className="text-xs text-amber-600">示範資料，非官方即時資訊</div>
                <div className="mt-1">
                  {p.city} {p.district} ・ {p.type} ・ {p.stage}
                </div>
                <div className="mt-1 text-slate-500">{p.description}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
