import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const hasCustomBg = /(^|\s)bg-/.test(className);
  const hasCustomBorder = /(^|\s)border(?!-aegean-50)/.test(className);
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl shadow-card ${hasCustomBg ? "" : "bg-white"} ${
        hasCustomBorder ? "" : "border border-aegean-50/80"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full bg-aegean-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-aegean-500 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 text-aegean-400 animate-fade-in">
      {icon && <div className="mb-3 opacity-70">{icon}</div>}
      <p className="font-semibold text-aegean-500">{title}</p>
      {subtitle && <p className="text-sm mt-1 max-w-[26ch]">{subtitle}</p>}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  color,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
        active
          ? color ?? "bg-aegean-500 text-white border-aegean-500"
          : "bg-white text-aegean-500 border-aegean-100"
      }`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-aegean-400 tracking-wide mb-2 px-1">
      {children}
    </h3>
  );
}
