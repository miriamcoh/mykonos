import { v4 as uuid } from "uuid";
import { createCloudStore } from "./createCloudStore";
import type { ChecklistItem, GirlName } from "@/types";

export const useChecklistStore = createCloudStore<ChecklistItem>("checklistItems");

export function newChecklistItem(
  label: string,
  category: string,
  assignedTo: GirlName | null = null,
  quantity = 1
): ChecklistItem {
  return {
    id: uuid(),
    label,
    assignedTo,
    packedBy: [],
    quantity,
    category,
    createdAt: new Date().toISOString(),
  };
}

export const CHECKLIST_CATEGORIES = [
  "בגדים",
  "טואלטיקה",
  "אלקטרוניקה",
  "מסמכים",
  "חוף וים",
  "אחר",
] as const;
