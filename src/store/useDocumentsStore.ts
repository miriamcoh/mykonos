import { v4 as uuid } from "uuid";
import { createCloudStore } from "./createCloudStore";
import type { DocumentKind, GirlName, TripDocument } from "@/types";
import { backend } from "@/lib/backend";

export const useDocumentsStore = createCloudStore<TripDocument>("documents");

export async function uploadDocument(
  file: File,
  name: string,
  kind: DocumentKind,
  uploadedBy: GirlName,
  onProgress?: (pct: number) => void
): Promise<TripDocument> {
  const { url, path } = await backend.storage.upload("documents", file, file.name, onProgress);
  return {
    id: uuid(),
    name,
    kind,
    url,
    path,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedBy,
    createdAt: new Date().toISOString(),
  };
}

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  ticket: "כרטיס טיסה",
  passport: "דרכון",
  hotel: "הזמנת מלון",
  insurance: "ביטוח נסיעות",
  other: "אחר",
};
