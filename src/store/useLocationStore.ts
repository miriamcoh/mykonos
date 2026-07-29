import { v4 as uuid } from "uuid";
import { createCloudStore } from "./createCloudStore";
import type { GirlName, LocationPing } from "@/types";
import { getCurrentPosition, googleMapsLink } from "@/lib/geolocation";

export const useLocationStore = createCloudStore<LocationPing>("locationPings");

export async function broadcastLocation(
  girl: GirlName,
  isPanic: boolean,
  message?: string
): Promise<LocationPing> {
  const pos = await getCurrentPosition();
  const ping: LocationPing = {
    id: uuid(),
    girl,
    lat: pos.lat,
    lng: pos.lng,
    accuracy: pos.accuracy,
    isPanic,
    message,
    createdAt: new Date().toISOString(),
  };
  return ping;
}

export function pingMapLink(ping: LocationPing): string {
  return googleMapsLink(ping.lat, ping.lng);
}

/** Latest ping per girl, most recent first. */
export function latestPerGirl(pings: LocationPing[]): LocationPing[] {
  const byGirl = new Map<GirlName, LocationPing>();
  [...pings]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((p) => byGirl.set(p.girl, p));
  return [...byGirl.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
