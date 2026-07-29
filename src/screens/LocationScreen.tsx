import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { AppShell } from "@/components/layout/AppShell";
import { Card, EmptyState, SectionTitle } from "@/components/ui/Misc";
import { PinIcon, SirenIcon } from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/useAuthStore";
import {
  broadcastLocation,
  latestPerGirl,
  pingFromPosition,
  pingMapLink,
  useLocationStore,
} from "@/store/useLocationStore";
import { timeAgo } from "@/lib/format";
import {
  isGeolocationSupported,
  stopWatchingPosition,
  watchPosition,
} from "@/lib/geolocation";
import {
  fireNotification,
  isNotificationSupported,
  requestNotificationPermission,
} from "@/lib/notifications";

const LIVE_UPDATE_INTERVAL_MS = 15_000;

export default function LocationScreen() {
  const { user } = useAuthStore();
  const { items, init, add, update } = useLocationStore();
  const [sendingPanic, setSendingPanic] = useState(false);
  const [isSharingLive, setIsSharingLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const livePingIdRef = useRef<string | null>(null);
  const lastSentAtRef = useRef(0);

  useEffect(() => init(), [init]);

  // Ask early (not only on first tap) so notifications about OTHER girls'
  // shares - which this device didn't initiate - are actually allowed to fire.
  useEffect(() => {
    if (isNotificationSupported()) requestNotificationPermission();
  }, []);

  // Stop the browser's GPS watch if the girl navigates away/closes the tab
  // while sharing - it must not keep running invisibly in the background.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) stopWatchingPosition(watchIdRef.current);
    };
  }, []);

  // Local notification when ANY OTHER girl starts a live share. This fires
  // per-device from the realtime sync, not as a true cross-device push (the
  // Notification API can't reach a phone that doesn't have the app open) -
  // every girl who has the app open sees it live as the share starts.
  const seenLiveIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!user) return;
    if (seenLiveIds.current === null) {
      // First snapshot after mount - seed silently, don't notify about
      // shares that were already live before this device opened the app.
      seenLiveIds.current = new Set(items.filter((p) => p.isLive).map((p) => p.id));
      return;
    }
    for (const ping of items) {
      if (ping.isLive && ping.girl !== user.name && !seenLiveIds.current.has(ping.id)) {
        seenLiveIds.current.add(ping.id);
        fireNotification(`${ping.girl} משתפת את המיקום שלה`, {
          body: "לחצו כדי לראות איפה היא במפה",
          tag: `location-live-${ping.girl}`,
        });
      }
      if (!ping.isLive) seenLiveIds.current.delete(ping.id);
    }
  }, [items, user]);

  const latest = latestPerGirl(items);

  function startLiveShare() {
    if (!user) return;
    setError(null);
    setStarting(true);
    const pingId = uuid();
    livePingIdRef.current = pingId;
    lastSentAtRef.current = 0;

    const id = watchPosition(
      async (pos) => {
        const now = Date.now();
        const isFirstFix = lastSentAtRef.current === 0;
        if (!isFirstFix && now - lastSentAtRef.current < LIVE_UPDATE_INTERVAL_MS) return;
        lastSentAtRef.current = now;

        try {
          if (isFirstFix) {
            await add(pingFromPosition(user.name, pos, { isPanic: false, isLive: true, id: pingId }));
            setStarting(false);
            setIsSharingLive(true);
          } else {
            await update(pingId, {
              lat: pos.lat,
              lng: pos.lng,
              accuracy: pos.accuracy,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          // Without this catch, a failed insert/update here (e.g. Supabase
          // RLS blocking the write) left the button stuck on "מתחילה..."
          // forever with zero feedback - watchPosition's success callback
          // isn't awaited by the browser, so a throw here was an invisible
          // unhandled rejection instead of a visible error.
          console.error("[mykonos] Live location share failed:", err);
          setError(
            err instanceof Error
              ? `שיתוף המיקום נכשל: ${err.message}`
              : "שיתוף המיקום נכשל - נסו שוב"
          );
          setStarting(false);
          stopLiveShare();
        }
      },
      (err) => {
        console.error("[mykonos] Geolocation watch error:", err);
        setError("לא הצלחנו לקבל מיקום - ודאו שהרשאת המיקום מאושרת בדפדפן");
        setStarting(false);
        stopLiveShare();
      }
    );
    watchIdRef.current = id;
  }

  async function stopLiveShare() {
    if (watchIdRef.current !== null) {
      stopWatchingPosition(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (livePingIdRef.current) {
      const pingId = livePingIdRef.current;
      livePingIdRef.current = null;
      try {
        await update(pingId, { isLive: false, updatedAt: new Date().toISOString() });
      } catch (err) {
        // Local watch is already stopped either way - just make sure the
        // "still live" flag doesn't stay stuck for other girls if this fails.
        console.error("[mykonos] Failed to flip live ping to stopped:", err);
      }
    }
    setIsSharingLive(false);
    setStarting(false);
  }

  async function sharePanic() {
    if (!user) return;
    setError(null);
    setSendingPanic(true);
    try {
      const ping = await broadcastLocation(user.name, true, "צריכה עזרה / נקודת מפגש");
      await add(ping);
    } catch (err) {
      console.error("[mykonos] Failed to broadcast panic location:", err);
      setError(
        err instanceof Error ? `שיתוף המיקום נכשל: ${err.message}` : "שיתוף המיקום נכשל - נסו שוב"
      );
    } finally {
      setSendingPanic(false);
    }
  }

  return (
    <AppShell title="שיתוף מיקום">
      {!isGeolocationSupported() && (
        <Card className="p-3 mb-4 bg-amber-50 border-none text-amber-700 text-sm">
          המכשיר הזה לא תומך בשיתוף מיקום
        </Card>
      )}
      {error && (
        <Card className="p-3 mb-4 bg-red-50 border-none text-red-600 text-sm">{error}</Card>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        {isSharingLive ? (
          <button
            onClick={stopLiveShare}
            className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-aegean-800 text-white font-bold shadow-soft active:scale-[0.97] transition-transform"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
            </span>
            עצירת שיתוף
          </button>
        ) : (
          <button
            onClick={startLiveShare}
            disabled={starting}
            className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-aegean-500 text-white font-bold shadow-soft active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            <PinIcon width={28} height={28} />
            {starting ? "מתחילה..." : "שיתוף מיקום"}
          </button>
        )}
        <button
          onClick={sharePanic}
          disabled={sendingPanic}
          className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-red-500 text-white font-bold shadow-soft active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <SirenIcon width={28} height={28} />
          {sendingPanic ? "משדרת..." : "כפתור פאניקה"}
        </button>
      </div>

      <SectionTitle>איפה כל אחת</SectionTitle>
      {latest.length === 0 ? (
        <EmptyState
          icon={<PinIcon width={36} height={36} />}
          title="אף אחת עדיין לא שיתפה מיקום"
        />
      ) : (
        <div className="space-y-2">
          {latest.map((ping) => (
            <a
              key={ping.id}
              href={pingMapLink(ping)}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <Card
                className={`p-3.5 flex items-center gap-3 ${
                  ping.isPanic ? "border-red-200 bg-red-50/60" : ""
                }`}
              >
                <Avatar name={ping.girl} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-aegean-900 flex items-center gap-1.5">
                    המיקום של {ping.girl}
                    {ping.isPanic && <span className="text-red-500">· דחוף!</span>}
                    {ping.isLive && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        חי
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-aegean-400">
                    {timeAgo(ping.updatedAt)} · לחיצה לפתיחה במפות
                  </p>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </AppShell>
  );
}
