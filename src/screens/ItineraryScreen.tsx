import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, EmptyState } from "@/components/ui/Misc";
import { Calendar } from "@/components/ui/Calendar";
import { Button, FAB } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { Sheet, ConfirmDialog } from "@/components/ui/Sheet";
import {
  BellIcon,
  CalendarIcon,
  CameraIcon,
  EditIcon,
  PinIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import {
  eventsForDate,
  newItineraryEvent,
  uploadItineraryPhoto,
  useItineraryStore,
} from "@/store/useItineraryStore";
import { useAuthStore } from "@/store/useAuthStore";
import { formatDayLabel, todayStr } from "@/lib/format";
import type { ItineraryEvent } from "@/types";
import {
  isNotificationSupported,
  requestNotificationPermission,
  scheduleReminder,
} from "@/lib/notifications";

const activeTimers = new Map<string, () => void>();

function armReminders(events: ItineraryEvent[], markFired: (id: string) => void) {
  events.forEach((ev) => {
    const key = ev.id;
    if (!ev.reminder.enabled || ev.reminder.firedAt) return;
    if (activeTimers.has(key)) return;
    const cancel = scheduleReminder(
      `${ev.title} · ${ev.location}`,
      `${ev.date}T${ev.time}:00`,
      ev.reminder.minutesBefore,
      () => markFired(ev.id)
    );
    activeTimers.set(key, cancel);
  });
}

export default function ItineraryScreen() {
  const { user } = useAuthStore();
  const { items, init, add, update, remove } = useItineraryStore();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [editing, setEditing] = useState<ItineraryEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => init(), [init]);

  useEffect(() => {
    armReminders(items, (id) => update(id, { reminder: { ...(items.find((e) => e.id === id)?.reminder ?? { enabled: true, minutesBefore: 30 }), firedAt: new Date().toISOString() } }));
  }, [items, update]);

  const eventDates = useMemo(() => new Set(items.map((e) => e.date)), [items]);

  const dayEvents = eventsForDate(items, selectedDate);

  return (
    <AppShell title={`לו״ז - ${formatDayLabel(selectedDate)}`}>
      <Calendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        eventDates={eventDates}
        todayDate={todayStr()}
      />

      {dayEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon width={40} height={40} />}
          title="אין עדיין אירועים ליום הזה"
          subtitle="לחצו על הכפתור הכחול כדי להוסיף פעילות, טיסה או ארוחה"
        />
      ) : (
        <div className="space-y-3 mt-1">
          {dayEvents.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onEdit={() => {
                setEditing(ev);
                setFormOpen(true);
              }}
              onDelete={() => setConfirmDelete(ev.id)}
            />
          ))}
        </div>
      )}

      <FAB
        label="הוספת אירוע"
        icon={<PlusIcon />}
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      />

      <EventFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaultDate={selectedDate}
        editing={editing}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, { ...data, updatedAt: new Date().toISOString() });
          } else if (user) {
            await add(newItineraryEvent(data, user.name));
          }
          setFormOpen(false);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="מחיקת אירוע"
        message="בטוחות שרוצות למחוק את האירוע הזה מהלו״ז?"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) remove(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </AppShell>
  );
}

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: ItineraryEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-0.5 w-14 shrink-0">
          <span className="text-base font-extrabold text-aegean-500">{event.time}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-aegean-900 truncate">{event.title}</h3>
          {event.location && (
            <p className="flex items-center gap-1 text-xs text-aegean-500 mt-0.5">
              <PinIcon width={13} height={13} /> {event.location}
            </p>
          )}
          {event.notes && (
            <p className="text-xs text-aegean-400 mt-1 line-clamp-2">{event.notes}</p>
          )}
          {event.reminder.enabled && (
            <p className="flex items-center gap-1 text-[11px] text-aegean-400 mt-1.5">
              <BellIcon width={12} height={12} />
              תזכורת {event.reminder.minutesBefore} דק׳ לפני
              {event.reminder.firedAt ? " · נשלחה" : ""}
            </p>
          )}
          {event.photos.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
              {event.photos.map((p) => (
                <img
                  key={p.id}
                  src={p.url}
                  alt=""
                  className="w-14 h-14 object-cover rounded-lg shrink-0"
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-full text-aegean-400 active:bg-aegean-50"
          >
            <EditIcon width={16} height={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-full text-red-400 active:bg-red-50"
          >
            <TrashIcon width={16} height={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function EventFormSheet({
  open,
  onClose,
  defaultDate,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  editing: ItineraryEvent | null;
  onSave: (data: Partial<ItineraryEvent> & Pick<ItineraryEvent, "title" | "time" | "date" | "location">) => void;
}) {
  const { user } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [date, setDate] = useState(defaultDate);
  const [location, setLocation] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<ItineraryEvent["photos"]>([]);
  const [reminderOn, setReminderOn] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState(30);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setTime(editing.time);
      setDate(editing.date);
      setLocation(editing.location);
      setMapUrl(editing.mapUrl ?? "");
      setNotes(editing.notes ?? "");
      setPhotos(editing.photos);
      setReminderOn(editing.reminder.enabled);
      setMinutesBefore(editing.reminder.minutesBefore);
    } else {
      setTitle("");
      setTime("09:00");
      setDate(defaultDate);
      setLocation("");
      setMapUrl("");
      setNotes("");
      setPhotos([]);
      setReminderOn(false);
      setMinutesBefore(30);
    }
  }, [editing, defaultDate, open]);

  async function handleFiles(files: FileList | null) {
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const photo = await uploadItineraryPhoto(file, user.name);
        setPhotos((prev) => [...prev, photo]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleReminderToggle(checked: boolean) {
    setReminderOn(checked);
    if (checked && isNotificationSupported()) {
      await requestNotificationPermission();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "עריכת אירוע" : "אירוע חדש"}>
      <Field label="שם האירוע">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="לדוגמה: טיסה, ארוחת ערב, שיט"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="תאריך">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="שעה">
          <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="מיקום">
        <TextInput
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="שם המקום / שכונה"
        />
      </Field>
      <Field label="קישור למפה (אופציונלי)">
        <TextInput
          value={mapUrl}
          onChange={(e) => setMapUrl(e.target.value)}
          placeholder="https://maps.google.com/..."
          dir="ltr"
        />
      </Field>
      <Field label="הערות">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Field label="תמונות מצורפות">
        <div className="flex gap-2 flex-wrap">
          {photos.map((p) => (
            <img key={p.id} src={p.url} className="w-16 h-16 rounded-xl object-cover" />
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded-xl border-2 border-dashed border-aegean-200 text-aegean-300 flex items-center justify-center"
          >
            <CameraIcon width={22} height={22} />
          </button>
        </div>
        {uploading && <p className="text-xs text-aegean-400 mt-1.5">מעלה תמונה...</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </Field>

      <Card className="p-3.5 mb-4 bg-aegean-50/60 border-none">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-aegean-700">
            <BellIcon width={16} height={16} /> תזכורת push
          </span>
          <input
            type="checkbox"
            checked={reminderOn}
            onChange={(e) => handleReminderToggle(e.target.checked)}
            className="w-5 h-5 accent-aegean-500"
          />
        </div>
        {reminderOn && (
          <div className="mt-3">
            <Select
              value={minutesBefore}
              onChange={(e) => setMinutesBefore(Number(e.target.value))}
            >
              {[10, 15, 30, 60, 120].map((m) => (
                <option key={m} value={m}>
                  התראה {m} דקות לפני
                </option>
              ))}
            </Select>
            {!isNotificationSupported() && (
              <p className="text-[11px] text-aegean-400 mt-1.5">
                הדפדפן הזה לא תומך בהתראות push
              </p>
            )}
          </div>
        )}
      </Card>

      <Button
        fullWidth
        size="lg"
        disabled={!title || !time || !date}
        onClick={() =>
          onSave({
            title,
            time,
            date,
            location,
            mapUrl: mapUrl || undefined,
            notes: notes || undefined,
            photos,
            reminder: { enabled: reminderOn, minutesBefore, firedAt: editing?.reminder.firedAt ?? null },
          })
        }
      >
        {editing ? "עדכון אירוע" : "הוספה ללו״ז"}
      </Button>
    </Sheet>
  );
}
