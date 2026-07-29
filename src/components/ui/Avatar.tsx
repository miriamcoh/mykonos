import type { GirlName } from "@/types";
import { GIRLS } from "@/types";

const COLORS: Record<GirlName, string> = {
  מרים: "bg-aegean-500",
  יעל: "bg-sky-500",
  שירה: "bg-cyan-500",
  נועה: "bg-indigo-500",
  אביגיל: "bg-blue-600",
};

export function girlColor(name: GirlName | string): string {
  return COLORS[name as GirlName] ?? "bg-aegean-400";
}

export function Avatar({
  name,
  size = 36,
}: {
  name: GirlName | string;
  size?: number;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-bold shrink-0 ${girlColor(
        name
      )}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-label={name}
    >
      {name.slice(0, 1)}
    </div>
  );
}

export { GIRLS };
