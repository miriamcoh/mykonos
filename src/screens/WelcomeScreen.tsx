import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CalendarIcon, PinIcon } from "@/components/ui/Icons";
import { EmptyState } from "@/components/ui/Misc";
import { useAuthStore } from "@/store/useAuthStore";
import { eventsForDate, useItineraryStore } from "@/store/useItineraryStore";
import { GIRLS } from "@/types";
import type { GirlName } from "@/types";
import { formatDayLabel, todayStr } from "@/lib/format";
import { isNotificationSupported, requestNotificationPermission } from "@/lib/notifications";

export default function WelcomeScreen() {
  const { login } = useAuthStore();
  const { items, init } = useItineraryStore();
  const [picked, setPicked] = useState<GirlName | null>(null);

  useEffect(() => init(), [init]);

  useEffect(() => {
    if (picked && isNotificationSupported()) {
      requestNotificationPermission();
    }
  }, [picked]);

  if (picked) {
    return (
      <TodayItineraryPopup
        name={picked}
        events={eventsForDate(items, todayStr())}
        onContinue={() => login(picked)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-aegean-500 to-aegean-700 flex flex-col justify-center px-6 py-10">
      <div className="text-center mb-10 animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center text-4xl">
          🏝️
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-1">טסים למיקונוס</h1>
        <p className="text-aegean-100/90 text-sm">מי את?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full animate-slide-up">
        {GIRLS.map((name) => (
          <button
            key={name}
            onClick={() => setPicked(name)}
            className="flex flex-col items-center gap-2.5 bg-white/95 rounded-2xl py-6 shadow-soft active:scale-[0.96] transition-transform"
          >
            <Avatar name={name} size={52} />
            <span className="font-bold text-aegean-800">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TodayItineraryPopup({
  name,
  events,
  onContinue,
}: {
  name: GirlName;
  events: ReturnType<typeof eventsForDate>;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-dvh bg-santorini-fog flex flex-col">
      <div className="bg-aegean-500 text-white px-6 pt-14 pb-8 rounded-b-[2.5rem] text-center animate-fade-in">
        <Avatar name={name} size={64} />
        <h1 className="text-xl font-extrabold mt-3">שלום {name} 👋</h1>
        <p className="text-aegean-100 text-sm mt-1">זה הלו״ז להיום - {formatDayLabel(todayStr())}</p>
      </div>

      <div className="flex-1 px-5 py-6 max-w-md w-full mx-auto animate-slide-up">
        {events.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon width={36} height={36} />}
            title="אין עדיין תוכניות ליום הזה"
            subtitle="אפשר להוסיף אירועים ללו״ז אחרי הכניסה לאפליקציה"
          />
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="bg-white rounded-2xl shadow-card p-4 flex gap-3">
                <span className="font-extrabold text-aegean-500 w-14 shrink-0">{ev.time}</span>
                <div>
                  <p className="font-bold text-aegean-900">{ev.title}</p>
                  {ev.location && (
                    <p className="flex items-center gap-1 text-xs text-aegean-500 mt-0.5">
                      <PinIcon width={12} height={12} /> {ev.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <Button fullWidth size="lg" onClick={onContinue}>
          בואי נתחיל
        </Button>
      </div>
    </div>
  );
}
