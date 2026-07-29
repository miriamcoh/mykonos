import { backend, isCloudBackend } from "@/lib/backend";

/** Small header badge so it's never a silent mystery whether data is really syncing across phones. */
export function SyncBadge() {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isCloudBackend ? "bg-emerald-400/20 text-emerald-50" : "bg-amber-400/20 text-amber-50"
      }`}
      title={
        isCloudBackend
          ? `מסונכרן לענן (${backend.name}) - כולן רואות את אותו מידע`
          : "מצב מקומי - המידע נשמר רק במכשיר הזה ולא מסתנכרן לבנות האחרות"
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isCloudBackend ? "bg-emerald-300" : "bg-amber-300"}`}
      />
      {isCloudBackend ? "מסונכרן" : "מקומי בלבד"}
    </span>
  );
}
