import { useState } from "react";
import { ChevronEndIcon, ChevronStartIcon } from "./Icons";

const WEEKDAY_LABELS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]; // Sun..Sat, Israeli week start

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local-time YYYY-MM-DD, deliberately not going through toISOString (which
 * is UTC and can silently shift the date near midnight). */
function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseDateStr(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d };
}

interface CalendarProps {
  /** Selected date, "YYYY-MM-DD". */
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** Dates ("YYYY-MM-DD") that should show an event dot. */
  eventDates?: Set<string>;
  todayDate?: string;
}

export function Calendar({ selectedDate, onSelectDate, eventDates, todayDate }: CalendarProps) {
  const sel = parseDateStr(selectedDate);
  const [viewYear, setViewYear] = useState(sel.y);
  const [viewMonth, setViewMonth] = useState(sel.m); // 0-indexed

  const today = todayDate ?? toDateStr(sel.y, sel.m, sel.d);

  function changeMonth(delta: number) {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay(); // 0=Sunday
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;

  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - leadingBlanks + 1;
    if (dayNum < 1) {
      const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
      const d = prevMonthDays + dayNum;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ date: toDateStr(y, m, d), day: d, inMonth: false });
    } else if (dayNum > daysInMonth) {
      const d = dayNum - daysInMonth;
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ date: toDateStr(y, m, d), day: d, inMonth: false });
    } else {
      cells.push({ date: toDateStr(viewYear, viewMonth, dayNum), day: dayNum, inMonth: true });
    }
  }

  const monthLabel = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(
    firstOfMonth
  );

  return (
    <div className="bg-white rounded-2xl shadow-card border border-aegean-50/80 p-3.5 mb-4">
      <div className="flex items-center justify-between mb-3 px-1">
        {/* RTL reading order: "next" moves content leftward, "previous" rightward. */}
        <button
          onClick={() => changeMonth(1)}
          aria-label="חודש הבא"
          className="p-1.5 rounded-full text-aegean-400 active:bg-aegean-50"
        >
          <ChevronStartIcon width={18} height={18} />
        </button>
        <h3 className="font-bold text-aegean-900 text-sm">{monthLabel}</h3>
        <button
          onClick={() => changeMonth(-1)}
          aria-label="חודש קודם"
          className="p-1.5 rounded-full text-aegean-400 active:bg-aegean-50"
        >
          <ChevronEndIcon width={18} height={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="text-[11px] font-bold text-aegean-300 py-1">
            {w}
          </span>
        ))}

        {cells.map(({ date, day, inMonth }) => {
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const hasEvents = eventDates?.has(date);
          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                isSelected
                  ? "bg-aegean-500 text-white"
                  : isToday
                  ? "border border-aegean-400 text-aegean-600"
                  : inMonth
                  ? "text-aegean-700 active:bg-aegean-50"
                  : "text-aegean-200"
              }`}
            >
              {day}
              {hasEvents && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    isSelected ? "bg-white" : "bg-aegean-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
