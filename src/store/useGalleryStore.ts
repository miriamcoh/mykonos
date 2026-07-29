import { v4 as uuid } from "uuid";
import { createCloudStore } from "./createCloudStore";
import type { GalleryPhoto, GirlName } from "@/types";
import { backend } from "@/lib/backend";

export const useGalleryStore = createCloudStore<GalleryPhoto>("galleryPhotos");

/**
 * Mass upload: fires all uploads concurrently (bounded) so "thousands of
 * photos" don't lock up the UI thread. Each photo gets its own doc immediately
 * with status "uploading" so the grid shows live progress, then flips to
 * "done" (or "error") once the CloudStorage upload resolves.
 */
export async function uploadPhotosToGallery(
  files: FileList | File[],
  uploadedBy: GirlName,
  add: (item: GalleryPhoto) => Promise<void>,
  update: (id: string, patch: Partial<GalleryPhoto>) => Promise<void>,
  concurrency = 4
) {
  const list = Array.from(files);
  let cursor = 0;

  async function worker() {
    while (cursor < list.length) {
      const file = list[cursor++];
      const id = uuid();
      const placeholder: GalleryPhoto = {
        id,
        url: URL.createObjectURL(file),
        fileName: file.name,
        size: file.size,
        uploadedBy,
        createdAt: new Date().toISOString(),
        uploadProgress: 0,
        status: "uploading",
      };
      await add(placeholder);
      try {
        const { url, path } = await backend.storage.upload(
          "gallery",
          file,
          file.name,
          (pct) => update(id, { uploadProgress: pct })
        );
        await update(id, { url, path, uploadProgress: 100, status: "done" });
      } catch {
        await update(id, { status: "error" });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
}

export async function downloadGalleryPhoto(photo: GalleryPhoto) {
  await backend.storage.download(photo.url, photo.fileName);
}
