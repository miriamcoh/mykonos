import { NavLink } from "react-router-dom";
import {
  CalendarIcon,
  ChecklistIcon,
  FileIcon,
  ImageIcon,
  PinIcon,
  VoteIcon,
  WalletIcon,
} from "@/components/ui/Icons";

const NAV_ITEMS = [
  { to: "/", label: "לו\"ז", Icon: CalendarIcon, end: true },
  { to: "/expenses", label: "כספים", Icon: WalletIcon },
  { to: "/documents", label: "מסמכים", Icon: FileIcon },
  { to: "/location", label: "מיקום", Icon: PinIcon },
  { to: "/checklist", label: "ציוד", Icon: ChecklistIcon },
  { to: "/gallery", label: "גלריה", Icon: ImageIcon },
  { to: "/polls", label: "הצבעות", Icon: VoteIcon },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-aegean-100 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-between px-1 overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1 min-w-[52px]">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                  isActive ? "text-aegean-500" : "text-aegean-300"
                }`
              }
            >
              <Icon width={21} height={21} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
