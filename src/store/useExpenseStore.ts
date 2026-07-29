import { v4 as uuid } from "uuid";
import { createCloudStore } from "./createCloudStore";
import type { DebtLine, Expense, GirlName } from "@/types";
import { GIRLS } from "@/types";

export const useExpenseStore = createCloudStore<Expense>("expenses");

export function newExpense(
  data: Pick<Expense, "title" | "amount" | "paidBy" | "category" | "splitBetween"> &
    Partial<Expense>
): Expense {
  return {
    id: uuid(),
    title: data.title,
    amount: data.amount,
    currency: data.currency ?? "EUR",
    paidBy: data.paidBy,
    category: data.category,
    splitBetween: data.splitBetween,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
}

/** Total amount, normalized to EUR-equivalent isn't attempted here (single-currency trips assumed per list). */
export function totalSpent(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function totalPaidBy(expenses: Expense[], girl: GirlName): number {
  return expenses.filter((e) => e.paidBy === girl).reduce((s, e) => s + e.amount, 0);
}

export function totalOwedBy(expenses: Expense[], girl: GirlName): number {
  return expenses.reduce((sum, e) => {
    if (!e.splitBetween.includes(girl)) return sum;
    return sum + e.amount / e.splitBetween.length;
  }, 0);
}

/** net = what she paid minus her fair share. Positive = trip owes her. */
export function netBalances(expenses: Expense[]): Record<GirlName, number> {
  const net: Record<string, number> = {};
  GIRLS.forEach((g) => (net[g] = 0));
  expenses.forEach((e) => {
    net[e.paidBy] = (net[e.paidBy] ?? 0) + e.amount;
    const share = e.amount / e.splitBetween.length;
    e.splitBetween.forEach((g) => {
      net[g] = (net[g] ?? 0) - share;
    });
  });
  return net as Record<GirlName, number>;
}

/** Greedy settlement: minimal number of transfers to zero out all balances. */
export function simplifyDebts(expenses: Expense[]): DebtLine[] {
  const net = netBalances(expenses);
  const creditors = (Object.entries(net) as [GirlName, number][])
    .filter(([, v]) => v > 0.01)
    .sort((a, b) => b[1] - a[1]);
  const debtors = (Object.entries(net) as [GirlName, number][])
    .filter(([, v]) => v < -0.01)
    .sort((a, b) => a[1] - b[1]);

  const lines: DebtLine[] = [];
  let ci = 0;
  let di = 0;
  const creditorsMut = creditors.map(([name, amt]) => ({ name, amt }));
  const debtorsMut = debtors.map(([name, amt]) => ({ name, amt: -amt }));

  while (ci < creditorsMut.length && di < debtorsMut.length) {
    const c = creditorsMut[ci];
    const d = debtorsMut[di];
    const amount = Math.min(c.amt, d.amt);
    if (amount > 0.01) {
      lines.push({ from: d.name, to: c.name, amount: Math.round(amount * 100) / 100 });
    }
    c.amt -= amount;
    d.amt -= amount;
    if (c.amt <= 0.01) ci++;
    if (d.amt <= 0.01) di++;
  }
  return lines;
}
