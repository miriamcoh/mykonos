import { Avatar } from "@/components/ui/Avatar";
import { LogoutIcon } from "@/components/ui/Icons";
import { SyncBadge } from "@/components/ui/SyncBadge";
import { useAuthStore } from "@/store/useAuthStore";

export function Header({ title }: { title: string }) {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-20 bg-aegean-500 text-white pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-aegean-100/80 font-medium">טסים למיקונוס</p>
            <SyncBadge />
          </div>
          <h1 className="text-lg font-bold leading-tight">{title}</h1>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <Avatar name={user.name} size={34} />
            <button
              onClick={logout}
              aria-label="החלפת משתמשת"
              className="p-1.5 rounded-full text-aegean-100 active:bg-aegean-600"
            >
              <LogoutIcon width={18} height={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
