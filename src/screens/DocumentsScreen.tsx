import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, EmptyState, ProgressBar, SectionTitle } from "@/components/ui/Misc";
import { Button, FAB } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Sheet, ConfirmDialog } from "@/components/ui/Sheet";
import { DownloadIcon, FileIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/ui/Icons";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/store/useAuthStore";
import {
  DOCUMENT_KIND_LABELS,
  uploadDocument,
  useDocumentsStore,
} from "@/store/useDocumentsStore";
import type { DocumentKind } from "@/types";
import { backend } from "@/lib/backend";
import { formatBytes, timeAgo } from "@/lib/format";

const KIND_ORDER: DocumentKind[] = ["ticket", "passport", "hotel", "insurance", "other"];

export default function DocumentsScreen() {
  const { user } = useAuthStore();
  const { items, init, add, remove } = useDocumentsStore();
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => init(), [init]);

  return (
    <AppShell title="מסמכים חשובים">
      {items.length === 0 ? (
        <EmptyState
          icon={<FileIcon width={38} height={38} />}
          title="עדיין לא הועלו מסמכים"
          subtitle="כרטיסי טיסה, דרכונים, אישורי מלון - הכל במקום אחד שכולן רואות"
        />
      ) : (
        KIND_ORDER.map((kind) => {
          const docs = items.filter((d) => d.kind === kind);
          if (docs.length === 0) return null;
          return (
            <div key={kind} className="mb-5">
              <SectionTitle>{DOCUMENT_KIND_LABELS[kind]}</SectionTitle>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <Card key={doc.id} className="p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-aegean-50 flex items-center justify-center text-aegean-500 shrink-0">
                      <FileIcon width={20} height={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-aegean-900 truncate">{doc.name}</p>
                      <p className="text-[11px] text-aegean-400">
                        {formatBytes(doc.size)} · {doc.uploadedBy} · {timeAgo(doc.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => backend.storage.download(doc.url, doc.name)}
                        className="p-2 rounded-full text-aegean-500 active:bg-aegean-50"
                        aria-label="הורדה"
                      >
                        <DownloadIcon width={17} height={17} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(doc.id)}
                        className="p-2 rounded-full text-red-400 active:bg-red-50"
                        aria-label="מחיקה"
                      >
                        <TrashIcon width={17} height={17} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}

      <FAB label="העלאת מסמך" icon={<PlusIcon />} onClick={() => setFormOpen(true)} />

      <UploadSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onDone={async (doc) => {
          await add(doc);
          setFormOpen(false);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="מחיקת מסמך"
        message="המסמך יימחק לכל הבנות. להמשיך?"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) remove(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </AppShell>
  );
}

function UploadSheet({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (doc: Awaited<ReturnType<typeof uploadDocument>>) => void;
}) {
  const { user } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DocumentKind>("ticket");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setName("");
      setKind("ticket");
      setProgress(null);
      setError(null);
    }
  }, [open]);

  async function handleUpload() {
    if (!file || !user) return;
    setProgress(0);
    setError(null);
    try {
      const doc = await uploadDocument(file, name || file.name, kind, user.name, setProgress);
      onDone(doc);
    } catch (err) {
      console.error("[mykonos] Failed to upload document:", err);
      setError(err instanceof Error ? err.message : "ההעלאה נכשלה - נסו שוב");
      setProgress(null);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="העלאת מסמך">
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full border-2 border-dashed border-aegean-200 rounded-2xl py-8 flex flex-col items-center gap-2 text-aegean-400 mb-4"
      >
        <UploadIcon width={26} height={26} />
        <span className="text-sm font-semibold">
          {file ? file.name : "לחיצה לבחירת קובץ (PDF / תמונה)"}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
        }}
      />

      <Field label="שם המסמך">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="כרטיס טיסה - מרים" />
      </Field>
      <Field label="סוג">
        <Select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {DOCUMENT_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
      </Field>

      {progress !== null && (
        <div className="mb-4">
          <ProgressBar pct={progress} />
        </div>
      )}
      {error && (
        <Card className="p-3 mb-4 bg-red-50 border-none text-red-600 text-sm">{error}</Card>
      )}

      <Button fullWidth size="lg" disabled={!file || progress !== null} onClick={handleUpload}>
        {progress !== null ? `מעלה... ${progress}%` : "העלאה"}
      </Button>
    </Sheet>
  );
}
