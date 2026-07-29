import { v4 as uuid } from "uuid";
import { createCloudStore } from "./createCloudStore";
import type { GirlName, ItineraryEvent, ItineraryPhoto } from "@/types";
import { backend } from "@/lib/backend";

export const useItineraryStore = createCloudStore<ItineraryEvent>("itineraryEvents");

export function newItineraryEvent(
  data: Pick<ItineraryEvent, "title" | "time" | "date" | "location"> &
    Partial<ItineraryEvent>,
  createdBy: GirlName
): ItineraryEvent {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    title: data.title,
    time: data.time,
    date: data.date,
    location: data.location,
    mapUrl: data.mapUrl,
    notes: data.notes,
    photos: data.photos ?? [],
    reminder: data.reminder ?? { enabled: false, minutesBefore: 30, firedAt: null },
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

export async function uploadItineraryPhoto(
  file: File,
  addedBy: GirlName
): Promise<ItineraryPhoto> {
  const { url, path } = await backend.storage.upload("itinerary", file, file.name);
  return { id: uuid(), url, path, addedBy, createdAt: new Date().toISOString() };
}

export function eventDateTimeIso(ev: ItineraryEvent): string {
  return `${ev.date}T${ev.time}:00`;
}

export function sortEvents(events: ItineraryEvent[]): ItineraryEvent[] {
  return [...events].sort((a, b) =>
    eventDateTimeIso(a).localeCompare(eventDateTimeIso(b))
  );
}

export function eventsForDate(events: ItineraryEvent[], date: string): ItineraryEvent[] {
  return sortEvents(events.filter((e) => e.date === date));
}
