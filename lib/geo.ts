import { listAllDistrictCentroids, type DistrictCentroid } from "./districtGeo";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 兩點間的球面距離（公里），輸入為 [緯度, 經度] */
export function haversineDistanceKm(
  a: [number, number],
  b: [number, number]
): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface DistrictWithDistance extends DistrictCentroid {
  distanceKm: number;
}

/**
 * 找出中心點座標一定半徑（公里）內的所有行政區，依距離由近到遠排序。
 * 用「行政區中心點是否落在圓內」判斷，而非逐筆物件座標。
 */
export function findDistrictsWithinRadius(
  center: [number, number],
  radiusKm: number,
  centroids: DistrictCentroid[] = listAllDistrictCentroids()
): DistrictWithDistance[] {
  return centroids
    .map((c) => ({ ...c, distanceKm: haversineDistanceKm(center, [c.lat, c.lng]) }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
