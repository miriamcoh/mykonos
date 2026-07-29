// Core domain types shared across the whole app.

export const GIRLS = ["מרים", "יעל", "שירה", "נועה", "אביגיל"] as const;
export type GirlName = (typeof GIRLS)[number];

export interface AppUser {
  name: GirlName;
  loggedInAt: string; // ISO date
}

// ---------- Itinerary ----------
export interface ItineraryPhoto {
  id: string;
  url: string; // object URL locally, storage download URL in the cloud
  path?: string; // storage path, used to delete/download from bucket
  addedBy: GirlName;
  createdAt: string;
}

export interface ReminderConfig {
  enabled: boolean;
  minutesBefore: number; // e.g. 30
  firedAt?: string | null;
}

export interface ItineraryEvent {
  id: string;
  title: string;
  time: string; // "HH:mm"
  date: string; // "YYYY-MM-DD"
  location: string; // free text location tag
  mapUrl?: string;
  notes?: string;
  photos: ItineraryPhoto[];
  reminder: ReminderConfig;
  createdBy: GirlName;
  createdAt: string;
  updatedAt: string;
}

// ---------- Expenses ----------
export type ExpenseCategory =
  | "אוכל"
  | "לינה"
  | "תחבורה"
  | "בילויים"
  | "קניות"
  | "אחר";

export interface ExpenseSplit {
  girl: GirlName;
  included: boolean;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: "EUR" | "ILS" | "USD";
  paidBy: GirlName;
  category: ExpenseCategory;
  splitBetween: GirlName[]; // who shares this expense
  date: string;
  createdAt: string;
}

export interface DebtLine {
  from: GirlName;
  to: GirlName;
  amount: number;
}

// ---------- Documents ----------
export type DocumentKind = "ticket" | "passport" | "hotel" | "insurance" | "other";

export interface TripDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  url: string;
  path?: string;
  mimeType: string;
  size: number;
  uploadedBy: GirlName;
  createdAt: string;
}

// ---------- Location sharing ----------
export interface LocationPing {
  id: string;
  girl: GirlName;
  lat: number;
  lng: number;
  accuracy: number | null;
  isPanic: boolean;
  message?: string;
  createdAt: string;
}

// ---------- Checklist ----------
export interface ChecklistItem {
  id: string;
  label: string;
  assignedTo: GirlName | null;
  packedBy: GirlName[]; // who marked as packed (supports "each brings her own")
  quantity: number;
  category: string;
  createdAt: string;
}

// ---------- Gallery ----------
export interface GalleryPhoto {
  id: string;
  url: string;
  thumbUrl?: string;
  path?: string;
  fileName: string;
  size: number;
  uploadedBy: GirlName;
  createdAt: string;
  uploadProgress?: number; // 0-100 while uploading
  status: "uploading" | "done" | "error";
}

// ---------- Polls ----------
export interface PollOption {
  id: string;
  label: string;
  votes: GirlName[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: GirlName;
  createdAt: string;
  closed: boolean;
  multiChoice: boolean;
}
