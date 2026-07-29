import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

const variantClasses: Record<Variant, string> = {
  primary: "bg-aegean-500 text-white active:bg-aegean-600 shadow-soft",
  secondary: "bg-aegean-50 text-aegean-700 active:bg-aegean-100",
  ghost: "bg-transparent text-aegean-700 active:bg-aegean-50",
  danger: "bg-red-500 text-white active:bg-red-600",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 rounded-xl",
  lg: "text-base px-5 py-3.5 rounded-2xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function FAB({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: ReactNode;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed z-30 bottom-24 end-4 flex items-center justify-center w-14 h-14 rounded-full bg-aegean-500 text-white shadow-soft active:scale-95 transition-transform"
    >
      {icon}
    </button>
  );
}
