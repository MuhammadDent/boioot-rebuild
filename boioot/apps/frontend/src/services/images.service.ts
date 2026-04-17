/**
 * images.service.ts
 * All image-related API calls for the R2 upload pipeline.
 *
 * Upload path: Frontend → Backend (POST /api/upload/image) → R2
 * The backend handles multipart upload, WebP conversion, and R2 storage.
 *
 * Other endpoints:
 *   POST   /api/images/attach                  — attach UserImage to entity
 *   POST   /api/images/{id}/set-cover          — set cover
 *   POST   /api/images/reorder                 — reorder images
 *   DELETE /api/images/{id}/detach             — detach only (keep R2)
 *   DELETE /api/images/{id}?entityType=        — full delete (R2 + DB)
 *   GET    /api/images/{entityType}/{id}       — get all images for entity
 */

import { apiConfig } from "@/lib/api-config";

const BASE = apiConfig.baseUrl;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadedImageInfo {
  id:           string;  // UserImage.Id
  url:          string;  // public CDN URL
  thumbnailUrl?: string; // WebP thumbnail URL (available after processing)
}

export interface AttachRequest {
  entityId:   string;
  entityType: string;  // "property" | "project"
  imageId:    string;  // UserImage.Id
}

export interface ReorderItem {
  imageId:   string;  // PropertyImage.Id
  sortOrder: number;
}

export interface ReorderRequest {
  entityId:   string;
  entityType: string;
  items:      ReorderItem[];
}

export interface ServerImageItem {
  id:          string;   // PropertyImage.Id
  imageUrl:    string;
  isCover:     boolean;
  isPrimary:   boolean;
  order:       number;
  userImageId: string | null;
  imageSource: string;   // "legacy" | "user_upload"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function throwIfError(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  throw new Error((body as { error?: string }).error ?? fallback);
}

// ── Service ───────────────────────────────────────────────────────────────────

export const imagesService = {

  // ── Upload via Backend (Frontend → Backend → R2) ──────────────────────────
  //
  // Uploads file through POST /api/upload/image (multipart/form-data).
  // The backend handles: validation, WebP conversion, R2 storage, UserImage record.
  // Returns { id, url, thumbnailUrl }.
  //
  // uploadViaDirect is kept as an alias for backward compatibility with existing
  // component call sites — it simply delegates to upload().
  //
  async uploadViaDirect(file: File, token: string): Promise<UploadedImageInfo> {
    return imagesService.upload(file, token);
  },

  async upload(file: File, token: string): Promise<UploadedImageInfo> {
    console.log(`[images:upload] ▶ POST ${BASE}/upload/image — file="${file.name}" size=${file.size}B`);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BASE}/upload/image`, {
      method:  "POST",
      headers: authHeader(token),
      body:    fd,
    });
    await throwIfError(res, "فشل رفع الصورة");
    const result = await res.json() as UploadedImageInfo;
    console.log(`[images:upload] ✓ Upload complete — id="${result.id}" url="${result.url}"`);
    return result;
  },

  // ── Attach ────────────────────────────────────────────────────────────────

  async attach(req: AttachRequest, token: string): Promise<void> {
    const res = await fetch(`${BASE}/images/attach`, {
      method:  "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body:    JSON.stringify(req),
    });
    await throwIfError(res, "فشل ربط الصورة بالعقار");
  },

  // ── Set Cover ─────────────────────────────────────────────────────────────

  async setCover(propertyImageId: string, entityType: string, token: string): Promise<void> {
    const res = await fetch(
      `${BASE}/images/${propertyImageId}/set-cover?entityType=${entityType}`,
      { method: "POST", headers: authHeader(token) }
    );
    await throwIfError(res, "فشل تحديد صورة الغلاف");
  },

  // ── Reorder ───────────────────────────────────────────────────────────────

  async reorder(req: ReorderRequest, token: string): Promise<void> {
    const res = await fetch(`${BASE}/images/reorder`, {
      method:  "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body:    JSON.stringify(req),
    });
    await throwIfError(res, "فشل إعادة ترتيب الصور");
  },

  // ── Detach (keep R2) ──────────────────────────────────────────────────────

  async detach(propertyImageId: string, token: string): Promise<void> {
    const res = await fetch(`${BASE}/images/${propertyImageId}/detach`, {
      method:  "DELETE",
      headers: authHeader(token),
    });
    await throwIfError(res, "فشل إزالة الصورة");
  },

  // ── Full Delete (R2 + DB) ─────────────────────────────────────────────────

  async fullDelete(propertyImageId: string, entityType: string, token: string): Promise<void> {
    const res = await fetch(
      `${BASE}/images/${propertyImageId}?entityType=${entityType}`,
      { method: "DELETE", headers: authHeader(token) }
    );
    await throwIfError(res, "فشل حذف الصورة");
  },

  // ── Get Images ────────────────────────────────────────────────────────────

  async getImages(entityType: string, entityId: string, token: string): Promise<ServerImageItem[]> {
    const res = await fetch(`${BASE}/images/${entityType}/${entityId}`, {
      headers: authHeader(token),
    });
    await throwIfError(res, "فشل تحميل الصور");
    return res.json() as Promise<ServerImageItem[]>;
  },

  // ── Finalize Create ───────────────────────────────────────────────────────
  //
  // Called AFTER the entity (property/project) is created.
  // 1. Attaches all uploaded images to the entity.
  // 2. Refreshes server image list to get PropertyImage IDs.
  // 3. Sets cover.
  // 4. Reorders if > 1 image.
  //
  async finalizeCreate(
    entityId:   string,
    entityType: string,
    uploads:    { imageId: string; isCover: boolean; sortOrder: number }[],
    token:      string
  ): Promise<void> {
    if (uploads.length === 0) return;

    // 1. Attach all uploaded images
    const errors: string[] = [];
    for (const u of uploads) {
      try {
        await imagesService.attach(
          { entityId, entityType, imageId: u.imageId },
          token
        );
      } catch (e) {
        errors.push(u.imageId);
        console.error("[images] attach failed for", u.imageId, e);
      }
    }

    // 2. Fetch server images to get PropertyImage IDs
    const serverImages = await imagesService.getImages(entityType, entityId, token).catch(() => []);

    // Helper: find PropertyImage.Id by UserImage.Id
    const findPropImgId = (userImageId: string) =>
      serverImages.find((s) => s.userImageId === userImageId)?.id;

    // 3. Set cover
    const coverUpload = uploads.find((u) => u.isCover);
    if (coverUpload) {
      const propImgId = findPropImgId(coverUpload.imageId);
      if (propImgId) {
        await imagesService.setCover(propImgId, entityType, token).catch(console.error);
      }
    }

    // 4. Reorder (only if more than one image)
    if (uploads.length > 1) {
      const sorted = [...uploads].sort((a, b) => a.sortOrder - b.sortOrder);
      const items: ReorderItem[] = sorted
        .map((u, idx) => {
          const id = findPropImgId(u.imageId);
          return id ? { imageId: id, sortOrder: idx } : null;
        })
        .filter((x): x is ReorderItem => x !== null);

      if (items.length > 1) {
        await imagesService.reorder({ entityId, entityType, items }, token).catch(console.error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`تعذّر ربط ${errors.length} صورة — العقار تم إنشاؤه لكن بعض الصور لم تُضَف`);
    }
  },
};
