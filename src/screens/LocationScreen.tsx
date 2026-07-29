import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, EmptyState, SectionTitle } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { PinIcon, SirenIcon } from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/useAuthStore";
import {
  broadcastLocation,
  latestPerGirl,
  pingMapLink,
  useLocationStore,
} from "@/store/useLocationStore";
import { timeAgo } from "@/lib/format";
import { isGeolocationSupported } from "@/lib/geolocation";

export default function LocationScreen() {
  const { user } = useAuthStore();
  const { items, init, add } = useLocationStore();
  const [sending, setSending] = useState<"normal" | "panic" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => init(), [init]);

  const latest = latestPerGirl(items);

  async function share(isPanic: boolean) {
    if (!user) return;
    setError(null);
    setSending(isPanic ? "panic" : "normal");
    try {
      const ping = await broadcastLocation(
        user.name,
        isPanic,
        isPanic ? "צריכה עזרה / נקודת מפגש" : undefined
      );
      await add(ping);
    } catch {
      setError("לא הצלחנו לקבל מיקום - ודאו שהרשאת המיקום מאושרת בדפדפן");
    } finally {
      setSending(null);
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
        <button
          onClick={() => share(false)}
          disabled={sending !== null}
          className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-aegean-500 text-white font-bold shadow-soft active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <PinIcon width={28} height={28} />
          {sending === "normal" ? "משדרת..." : "שיתוף מיקום"}
        </button>
        <button
          onClick={() => share(true)}
          disabled={sending !== null}
          className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-red-500 text-white font-bold shadow-soft active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <SirenIcon width={28} height={28} />
          {sending === "panic" ? "משדרת..." : "כפתור פאניקה"}
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
                  <p className="font-semibold text-sm text-aegean-900">
                    המיקום של {ping.girl}
                    {ping.isPanic && <span className="text-red-500"> · דחוף!</span>}
                  </p>
                  <p className="text-[11px] text-aegean-400">{timeAgo(ping.createdAt)} · לחיצה לפתיחה במפות</p>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </AppShell>
  );
}
