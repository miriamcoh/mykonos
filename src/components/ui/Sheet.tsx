import type { ReactNode } from "react";
import { useEffect } from "react";
import { XIcon } from "./Icons";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-aegean-950/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl shadow-soft animate-slide-up pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="sticky top-0 bg-white/95 backdrop-blur px-5 pt-4 pb-3 flex items-center justify-between border-b border-aegean-50 rounded-t-3xl">
          <h2 className="text-lg font-bold text-aegean-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-aegean-400 active:bg-aegean-50"
            aria-label="סגור"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 animate-fade-in">
      <div className="absolute inset-0 bg-aegean-950/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-soft p-5 w-full max-w-xs animate-pop">
        <h3 className="font-bold text-aegean-900 mb-1">{title}</h3>
        <p className="text-sm text-aegean-600 mb-4">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-aegean-50 text-aegean-700 font-semibold text-sm"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm ${
              danger ? "bg-red-500" : "bg-aegean-500"
            }`}
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
