import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, EmptyState, SectionTitle } from "@/components/ui/Misc";
import { Button, FAB } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { CheckIcon, ChecklistIcon, PlusIcon, TrashIcon } from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/useAuthStore";
import {
  CHECKLIST_CATEGORIES,
  newChecklistItem,
  useChecklistStore,
} from "@/store/useChecklistStore";
import { GIRLS } from "@/types";
import type { GirlName } from "@/types";

export default function ChecklistScreen() {
  const { user } = useAuthStore();
  const { items, init, add, update, remove } = useChecklistStore();
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState<GirlName | "all">("all");

  useEffect(() => init(), [init]);

  const filtered = filter === "all" ? items : items.filter((i) => i.assignedTo === filter);
  const grouped = CHECKLIST_CATEGORIES.map((cat) => ({
    cat,
    items: filtered.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const packedCount = items.filter((i) => i.packedBy.length > 0).length;

  function togglePacked(id: string, currentlyPacked: boolean) {
    if (!user) return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const packedBy = currentlyPacked
      ? item.packedBy.filter((g) => g !== user.name)
      : [...item.packedBy, user.name];
    update(id, { packedBy });
  }

  return (
    <AppShell title="ציוד וחלוקה">
      <Card className="p-4 mb-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-aegean-400 font-medium">התקדמות אריזה</p>
          <p className="font-bold text-aegean-800">
            {packedCount} מתוך {items.length} פריטים
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-aegean-50 flex items-center justify-center font-bold text-aegean-500 text-sm">
          {items.length ? Math.round((packedCount / items.length) * 100) : 0}%
        </div>
      </Card>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          כולן
        </Chip>
        {GIRLS.map((g) => (
          <Chip key={g} active={filter === g} onClick={() => setFilter(g)}>
            {g}
          </Chip>
        ))}
      </div>

      {grouped.length === 0 ? (
        <EmptyState icon={<ChecklistIcon width={36} height={36} />} title="אין פריטים ברשימה" />
      ) : (
        grouped.map(({ cat, items: catItems }) => (
          <div key={cat} className="mb-5">
            <SectionTitle>{cat}</SectionTitle>
            <div className="space-y-2">
              {catItems.map((item) => {
                const packed = user ? item.packedBy.includes(user.name) : false;
                return (
                  <Card key={item.id} className="p-3 flex items-center gap-3">
                    <button
                      onClick={() => togglePacked(item.id, packed)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        packed
                          ? "bg-aegean-500 border-aegean-500 text-white"
                          : "border-aegean-200 text-transparent"
                      }`}
                    >
                      <CheckIcon width={15} height={15} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold text-sm ${
                          packed ? "text-aegean-300 line-through" : "text-aegean-900"
                        }`}
                      >
                        {item.label}
                        {item.quantity > 1 && ` ×${item.quantity}`}
                      </p>
                      {item.assignedTo && (
                        <p className="text-[11px] text-aegean-400">אחראית: {item.assignedTo}</p>
                      )}
                    </div>
                    {item.assignedTo && <Avatar name={item.assignedTo} size={26} />}
                    <button
                      onClick={() => remove(item.id)}
                      className="p-1.5 rounded-full text-red-300 active:bg-red-50"
                    >
                      <TrashIcon width={15} height={15} />
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      <FAB label="הוספת פריט" icon={<PlusIcon />} onClick={() => setFormOpen(true)} />
      <AddItemSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={async (item) => {
          try {
            await add(item);
            setFormOpen(false);
          } catch (err) {
            console.error("[mykonos] Failed to save checklist item:", err);
          }
        }}
      />
    </AppShell>
  );
}

function AddItemSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (item: ReturnType<typeof newChecklistItem>) => void;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<string>(CHECKLIST_CATEGORIES[0]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    if (open) {
      setLabel("");
      setCategory(CHECKLIST_CATEGORIES[0]);
      setAssignedTo("");
      setQuantity("1");
    }
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="פריט חדש">
      <Field label="פריט">
        <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="קרם הגנה, מטען נייד, מגבת חוף..." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="כמות">
          <TextInput type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="קטגוריה">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CHECKLIST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="להטיל על (אופציונלי)">
        <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">לא הוקצה</option>
          {GIRLS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        fullWidth
        size="lg"
        disabled={!label}
        onClick={() =>
          onSave(
            newChecklistItem(
              label,
              category,
              (assignedTo || null) as GirlName | null,
              Number(quantity) || 1
            )
          )
        }
      >
        הוספה לרשימה
      </Button>
    </Sheet>
  );
}
