// Thin wrapper around navigator.geolocation for the live-location feature.

export interface GeoResult {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function getCurrentPosition(): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error("המכשיר לא תומך בשיתוף מיקום"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  });
}

export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
