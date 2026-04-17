/**
 * images.service.ts
 * All image-related API calls for the R2 upload pipeline.
 *
 * Endpoints used:
 *   POST   /api/images/direct-upload-url       — request presigned PUT URL (NEW)
 *   POST   /api/images/finalize-direct-upload  — finalize after browser PUT (NEW)
 *   POST   /api/upload/image                   — legacy multipart upload (kept for compat)
 *   POST   /api/images/attach                  — attach UserImage to entity
 *   POST   /api/images/{id}/set-cover          — set cover
 *   POST   /api/images/reorder                 — reorder images
 *   DELETE /api/images/{id}/detach             — detach only (keep R2)
 *   DELETE /api/images/{id}?entityType=        — full delete (R2 + DB)
 *   GET    /api/images/{entityType}/{id}       — get all images for entity
 */

import { apiConfig } from "@/lib/api-config";

const BASE = apiConfig.baseUrl;

// When true: direct upload is forced — 501/network errors throw instead of falling back.
// Set NEXT_PUBLIC_FORCE_DIRECT_UPLOAD=true in .env.local to test the direct-upload
// path even when the backend returns 501 (reveals the actual error).
const FORCE_DIRECT =
  process.env.NEXT_PUBLIC_FORCE_DIRECT_UPLOAD === "true";

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

/** Response from POST /api/images/direct-upload-url */
interface DirectUploadUrlResponse {
  uploadUrl:        string;
  fileKey:          string;
  expiresInSeconds: number;
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

  // ── Direct Upload (presigned URL → R2 → finalize) ─────────────────────────
  //
  // Preferred upload path in production.
  //
  // Flow:
  //   1. Request presigned PUT URL from backend  (→ POST /api/images/direct-upload-url)
  //   2. Browser PUTs file directly to R2        (no backend involvement)
  //   3. Backend finalizes: downloads raw file,  (→ POST /api/images/finalize-direct-upload)
  //      processes WebP + thumbnail, creates UserImage
  //
  // If the backend returns 501 (unsupported — local dev mode) AND
  // NEXT_PUBLIC_FORCE_DIRECT_UPLOAD is NOT set, falls back automatically
  // to the legacy multipart POST /api/upload/image.
  //
  // Set NEXT_PUBLIC_FORCE_DIRECT_UPLOAD=true to disable the fallback and
  // surface the raw error (useful for debugging the direct-upload path).
  //
  async uploadViaDirect(file: File, token: string): Promise<UploadedImageInfo> {
    console.log(
      `[images:direct] ▶ Starting direct upload — file="${file.name}" ` +
      `size=${file.size}B type="${file.type}" ` +
      `FORCE_DIRECT=${FORCE_DIRECT}`
    );

    // Step 1 — request presigned URL
    console.log(`[images:direct] Step 1 → POST ${BASE}/images/direct-upload-url`);
    let urlRes: Response;
    try {
      urlRes = await fetch(`${BASE}/images/direct-upload-url`, {
        method:  "POST",
        headers: { ...authHeader(token), "Content-Type": "application/json" },
        body:    JSON.stringify({
          fileName:    file.name,
          contentType: file.type || "image/jpeg",
          sizeBytes:   file.size,
        }),
      });
    } catch (networkErr) {
      console.warn(
        "[images:direct] ✗ Step 1 NETWORK ERROR — could not reach /api/images/direct-upload-url.",
        networkErr
      );
      if (FORCE_DIRECT) {
        throw networkErr;
      }
      console.info("[images:direct] ↩ Falling back to legacy multipart upload (network error).");
      return imagesService.upload(file, token);
    }

    console.log(`[images:direct] Step 1 response → HTTP ${urlRes.status}`);

    // 501 = direct upload not supported by the active storage backend (local dev).
    // In local dev: LocalFileStorageService is used → GeneratePresignedUploadUrlAsync
    //               returns null → backend responds 501.
    // In production: R2FileStorageService is used → presigned URL is returned.
    if (urlRes.status === 501) {
      const body = await urlRes.json().catch(() => ({}));
      console.warn(
        "[images:direct] ✗ Step 1 returned 501 — backend is using LocalFileStorageService " +
        "(local dev mode). GeneratePresignedUploadUrlAsync() returned null.",
        body
      );
      if (FORCE_DIRECT) {
        throw new Error(
          `[images:direct] Direct upload returned 501. ` +
          `Backend is in local storage mode — R2 credentials are not configured. ` +
          `Detail: ${(body as { error?: string }).error ?? "no detail"}`
        );
      }
      console.info(
        "[images:direct] ↩ Falling back to legacy multipart upload " +
        "(set NEXT_PUBLIC_FORCE_DIRECT_UPLOAD=true in .env.local to disable this fallback)."
      );
      return imagesService.upload(file, token);
    }

    // Any other non-2xx error → throw (no fallback for unexpected errors)
    if (!urlRes.ok) {
      const body = await urlRes.json().catch(() => ({}));
      const msg = (body as { error?: string }).error ?? `HTTP ${urlRes.status}`;
      console.error(`[images:direct] ✗ Step 1 failed — ${msg}`);
      throw new Error(`فشل طلب رابط الرفع المباشر: ${msg}`);
    }

    const { uploadUrl, fileKey } = (await urlRes.json()) as DirectUploadUrlResponse;
    console.log(
      `[images:direct] ✓ Step 1 OK — fileKey="${fileKey}" ` +
      `uploadUrl="${uploadUrl.slice(0, 60)}…"`
    );

    // Step 2 — browser PUTs raw file directly to R2.
    //
    // WHY ArrayBuffer instead of File:
    //   fetch(url, { body: file }) — even with NO headers object — causes the
    //   browser to automatically inject "Content-Type: image/jpeg" from file.type.
    //   This is browser-native behaviour and cannot be suppressed any other way.
    //   When the presigned URL signature does NOT include Content-Type, R2 may
    //   reject the request.  Using an ArrayBuffer body bypasses this auto-injection
    //   because the browser treats raw binary buffers as content-type-less.
    console.log(`[images:direct] Step 2 → converting File to ArrayBuffer (type=${file.type} size=${file.size}B)`);
    const fileBuffer = await file.arrayBuffer();

    console.log(`[images:direct] Step 2 → PUT to R2 presigned URL (no Content-Type header)`);
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      body:   fileBuffer,
    });

    console.log(`[images:direct] Step 2 response → HTTP ${putRes.status}`);
    if (!putRes.ok) {
      const msg = `فشل الرفع المباشر إلى التخزين (${putRes.status}). حاول مرة أخرى.`;
      console.error(`[images:direct] ✗ Step 2 PUT to R2 failed — HTTP ${putRes.status}`);
      throw new Error(msg);
    }
    console.log(`[images:direct] ✓ Step 2 OK — file is now in R2 at key="${fileKey}"`);

    // Step 3 — finalize: backend processes and registers the image
    console.log(`[images:direct] Step 3 → POST ${BASE}/images/finalize-direct-upload`);
    const finalRes = await fetch(`${BASE}/images/finalize-direct-upload`, {
      method:  "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body:    JSON.stringify({
        fileKey,
        fileName:    file.name,
        contentType: file.type || "image/jpeg",
        sizeBytes:   file.size,
      }),
    });

    console.log(`[images:direct] Step 3 response → HTTP ${finalRes.status}`);
    if (!finalRes.ok) {
      const body = await finalRes.json().catch(() => ({}));
      const msg = (body as { error?: string }).error ?? "فشل إتمام معالجة الصورة";
      console.error(`[images:direct] ✗ Step 3 finalize failed — ${msg}`);
      throw new Error(msg);
    }

    const result = (await finalRes.json()) as UploadedImageInfo;
    console.log(
      `[images:direct] ✓ Step 3 OK — UserImage.Id="${result.id}" url="${result.url}"`
    );
    console.log(`[images:direct] ✅ Direct upload complete for "${file.name}"`);
    return result;
  },

  // ── Legacy Upload (multipart — kept for compatibility) ─────────────────────
  //
  // Sends the entire file through the backend API server.
  // Still used as fallback when direct upload is unavailable (local dev mode)
  // and remains the endpoint used by PropertyImageUploader as the fallback.
  //
  async upload(file: File, token: string): Promise<UploadedImageInfo> {
    console.log(`[images:legacy] ▶ Multipart upload → POST ${BASE}/upload/image — file="${file.name}"`);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BASE}/upload/image`, {
      method:  "POST",
      headers: authHeader(token),
      body:    fd,
    });
    await throwIfError(res, "فشل رفع الصورة");
    const result = await res.json() as UploadedImageInfo;
    console.log(`[images:legacy] ✓ Legacy upload complete — id="${result.id}"`);
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
