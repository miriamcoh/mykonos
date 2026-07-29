import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, ProgressBar } from "@/components/ui/Misc";
import { FAB } from "@/components/ui/Button";
import { DownloadIcon, ImageIcon, PlusIcon } from "@/components/ui/Icons";
import { Sheet } from "@/components/ui/Sheet";
import { useAuthStore } from "@/store/useAuthStore";
import {
  downloadGalleryPhoto,
  uploadPhotosToGallery,
  useGalleryStore,
} from "@/store/useGalleryStore";
import type { GalleryPhoto } from "@/types";
import { timeAgo } from "@/lib/format";

export default function GalleryScreen() {
  const { user } = useAuthStore();
  const { items, init, add, update } = useGalleryStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<GalleryPhoto | null>(null);

  useEffect(() => init(), [init]);

  const photos = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const inProgress = items.filter((p) => p.status === "uploading");

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length || !user) return;
    await uploadPhotosToGallery(files, user.name, add, update);
  }

  return (
    <AppShell title="גלריית הטיול">
      {inProgress.length > 0 && (
        <div className="mb-4 bg-aegean-50 rounded-xl p-3 text-xs text-aegean-600 font-semibold">
          מעלה {inProgress.length} תמונות...
        </div>
      )}

      {photos.length === 0 ? (
        <EmptyState
          icon={<ImageIcon width={38} height={38} />}
          title="עדיין אין תמונות בגלריה"
          subtitle="אפשר להעלות בבת אחת אלפי תמונות מהטיול - כולן יסתנכרנו לכל הבנות"
        />
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => photo.status === "done" && setPreview(photo)}
              className="relative aspect-square rounded-lg overflow-hidden bg-aegean-50"
            >
              <img
                src={photo.url}
                alt={photo.fileName}
                className={`w-full h-full object-cover ${
                  photo.status === "uploading" ? "opacity-50" : ""
                }`}
              />
              {photo.status === "uploading" && (
                <div className="absolute inset-x-1 bottom-1">
                  <ProgressBar pct={photo.uploadProgress ?? 0} />
                </div>
              )}
              {photo.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/70 text-white text-[10px] font-bold">
                  שגיאה
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <FAB
        label="העלאת תמונות"
        icon={<PlusIcon />}
        onClick={() => fileRef.current?.click()}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Sheet open={!!preview} onClose={() => setPreview(null)} title={preview?.fileName ?? ""}>
        {preview && (
          <div>
            <img src={preview.url} alt="" className="w-full rounded-xl mb-3 object-cover" />
            <p className="text-xs text-aegean-400 mb-4">
              הועלה ע״י {preview.uploadedBy} · {timeAgo(preview.createdAt)}
            </p>
            <button
              onClick={() => downloadGalleryPhoto(preview)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-aegean-500 text-white font-semibold"
            >
              <DownloadIcon width={18} height={18} />
              הורדה למכשיר
            </button>
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}
