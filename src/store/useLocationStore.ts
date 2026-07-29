import { v4 as uuid } from "uuid";
import { createCloudStore } from "./createCloudStore";
import type { GirlName, LocationPing } from "@/types";
import { getCurrentPosition, googleMapsLink, type GeoResult } from "@/lib/geolocation";

export const useLocationStore = createCloudStore<LocationPing>("locationPings");

/** One-shot ping - used for both a manual "share once" and the panic button. */
export async function broadcastLocation(
  girl: GirlName,
  isPanic: boolean,
  message?: string
): Promise<LocationPing> {
  const pos = await getCurrentPosition();
  return pingFromPosition(girl, pos, { isPanic, isLive: false, message });
}

export function pingFromPosition(
  girl: GirlName,
  pos: GeoResult,
  opts: { isPanic: boolean; isLive: boolean; message?: string; id?: string }
): LocationPing {
  const now = new Date().toISOString();
  return {
    id: opts.id ?? uuid(),
    girl,
    lat: pos.lat,
    lng: pos.lng,
    accuracy: pos.accuracy,
    isPanic: opts.isPanic,
    isLive: opts.isLive,
    message: opts.message,
    createdAt: now,
    updatedAt: now,
  };
}

export function pingMapLink(ping: LocationPing): string {
  return googleMapsLink(ping.lat, ping.lng);
}

/** Latest ping per girl (by last update), most recently active girl first. */
export function latestPerGirl(pings: LocationPing[]): LocationPing[] {
  const byGirl = new Map<GirlName, LocationPing>();
  [...pings]
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .forEach((p) => byGirl.set(p.girl, p));
  return [...byGirl.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
