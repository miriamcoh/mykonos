import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, EmptyState, SectionTitle } from "@/components/ui/Misc";
import { Button, FAB } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { PlusIcon, WalletIcon } from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar";
import { GIRLS } from "@/types";
import type { Expense, ExpenseCategory } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";
import {
  netBalances,
  newExpense,
  simplifyDebts,
  totalSpent,
  useExpenseStore,
} from "@/store/useExpenseStore";
import { formatMoney } from "@/lib/format";

const CATEGORIES: ExpenseCategory[] = ["אוכל", "לינה", "תחבורה", "בילויים", "קניות", "אחר"];

/**
 * Strips everything that isn't a digit or a decimal point (currency symbols,
 * letters, spaces, thousands separators...) and collapses to a single
 * decimal point. Deliberately NOT using <input type="number"> for amount:
 * per the HTML spec, a number input's `.value` silently becomes "" the
 * moment its content isn't a strictly valid float (e.g. anything pasted or
 * autofilled with a currency symbol/letter in it) - which was quietly
 * disabling the submit button below even though the field looked filled.
 */
function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("")}` : whole;
}

export default function ExpensesScreen() {
  const { items, init, add } = useExpenseStore();
  const [formOpen, setFormOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => init(), [init]);

  const total = totalSpent(items);
  const balances = netBalances(items);
  const debts = simplifyDebts(items);

  return (
    <AppShell title="הוצאות משותפות">
      <Card className="p-5 mb-4 bg-aegean-500 text-white border-none">
        <p className="text-xs text-aegean-100/80 font-medium">סה״כ הוצאות הטיול</p>
        <p className="text-3xl font-extrabold mt-1">{formatMoney(total, "EUR")}</p>
      </Card>

      <SectionTitle>מאזן אישי</SectionTitle>
      <div className="grid grid-cols-1 gap-2 mb-5">
        {GIRLS.map((g) => (
          <Card key={g} className="p-3 flex items-center gap-3">
            <Avatar name={g} />
            <span className="flex-1 font-semibold text-sm text-aegean-800">{g}</span>
            <span
              className={`text-sm font-bold ${
                balances[g] > 0.01
                  ? "text-emerald-600"
                  : balances[g] < -0.01
                  ? "text-red-500"
                  : "text-aegean-400"
              }`}
            >
              {balances[g] > 0.01 ? "+" : ""}
              {formatMoney(balances[g], "EUR")}
            </span>
          </Card>
        ))}
      </div>

      <SectionTitle>מי חייבת למי</SectionTitle>
      {debts.length === 0 ? (
        <Card className="p-4 text-center text-sm text-aegean-400 mb-5">הכל מאוזן! 🎉</Card>
      ) : (
        <div className="space-y-2 mb-5">
          {debts.map((d, i) => (
            <Card key={i} className="p-3 flex items-center gap-2 text-sm">
              <Avatar name={d.from} size={28} />
              <span className="font-semibold text-aegean-800">{d.from}</span>
              <span className="text-aegean-400">חייבת ל</span>
              <span className="font-semibold text-aegean-800">{d.to}</span>
              <span className="mr-auto font-bold text-aegean-600">
                {formatMoney(d.amount, "EUR")}
              </span>
            </Card>
          ))}
        </div>
      )}

      <SectionTitle>כל ההוצאות</SectionTitle>
      {items.length === 0 ? (
        <EmptyState icon={<WalletIcon width={36} height={36} />} title="אין עדיין הוצאות" />
      ) : (
        <div className="space-y-2">
          {[...items]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((e) => (
              <Card key={e.id} className="p-3.5 flex items-center gap-3">
                <Avatar name={e.paidBy} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-aegean-900 truncate">{e.title}</p>
                  <p className="text-xs text-aegean-400">
                    {e.paidBy} שילמה · מתחלק בין {e.splitBetween.length}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-bold text-aegean-800">{formatMoney(e.amount, e.currency)}</p>
                  <p className="text-[10px] text-aegean-300">{e.category}</p>
                </div>
              </Card>
            ))}
        </div>
      )}

      <FAB label="הוספת הוצאה" icon={<PlusIcon />} onClick={() => setFormOpen(true)} />
      <ExpenseFormSheet
        open={formOpen}
        saving={saving}
        error={saveError}
        onClose={() => {
          setSaveError(null);
          setFormOpen(false);
        }}
        onSave={async (e) => {
          setSaving(true);
          setSaveError(null);
          try {
            await add(e);
            setFormOpen(false);
          } catch (err) {
            console.error("[mykonos] Failed to save expense:", err);
            setSaveError(
              err instanceof Error ? err.message : "השמירה נכשלה - נסו שוב בעוד רגע"
            );
          } finally {
            setSaving(false);
          }
        }}
      />
    </AppShell>
  );
}

function ExpenseFormSheet({
  open,
  onClose,
  onSave,
  saving,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: Expense) => void;
  saving: boolean;
  error: string | null;
}) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"EUR" | "ILS" | "USD">("EUR");
  const [paidBy, setPaidBy] = useState(user?.name ?? GIRLS[0]);
  const [category, setCategory] = useState<ExpenseCategory>("אוכל");
  const [split, setSplit] = useState<string[]>([...GIRLS]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setAmount("");
      setPaidBy(user?.name ?? GIRLS[0]);
      setCategory("אוכל");
      setSplit([...GIRLS]);
    }
  }, [open, user]);

  function toggleGirl(g: string) {
    setSplit((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  const parsedAmount = Number(amount);
  const isValid =
    title.trim().length > 0 &&
    amount.length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    split.length > 0;

  return (
    <Sheet open={open} onClose={onClose} title="הוצאה חדשה">
      <Field label="על מה שילמתן?">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ארוחת ערב, טקסי, כניסה לאתר..." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="סכום">
          <TextInput
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Field label="מטבע">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)}>
            <option value="EUR">EUR €</option>
            <option value="ILS">ILS ₪</option>
            <option value="USD">USD $</option>
          </Select>
        </Field>
      </div>
      <Field label="מי שילמה">
        <Select value={paidBy} onChange={(e) => setPaidBy(e.target.value as typeof paidBy)}>
          {GIRLS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="קטגוריה">
        <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="מתחלק בין">
        <div className="flex gap-1.5 flex-wrap">
          {GIRLS.map((g) => (
            <Chip key={g} active={split.includes(g)} onClick={() => toggleGirl(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </Field>

      {error && (
        <Card className="p-3 mb-4 bg-red-50 border-none text-red-600 text-sm">{error}</Card>
      )}

      <Button
        fullWidth
        size="lg"
        disabled={!isValid || saving}
        onClick={() =>
          isValid &&
          !saving &&
          onSave(
            newExpense({
              title: title.trim(),
              amount: parsedAmount,
              currency,
              paidBy: paidBy as (typeof GIRLS)[number],
              category,
              splitBetween: split as (typeof GIRLS)[number][],
            })
          )
        }
      >
        {saving ? "שומרת..." : "הוספת הוצאה"}
      </Button>
    </Sheet>
  );
}
