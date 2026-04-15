"use client";

/**
 * PropertyImageUploader
 *
 * A self-contained image management component for property / project forms.
 *
 * CREATE MODE  (entityId not provided):
 *   – Files are uploaded immediately on selection.
 *   – Parent receives pending uploads via onPendingChange.
 *   – Parent calls imagesService.finalizeCreate() AFTER entity is saved.
 *
 * EDIT MODE  (entityId provided):
 *   – Existing images loaded from API / passed via initialImages.
 *   – Delete, set-cover, and reorder call the API immediately.
 *   – New uploads are attached immediately after uploading.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { tokenStorage } from "@/lib/token";
import { imagesService, type ServerImageItem } from "@/services/images.service";
import type { PropertyImageResponse } from "@/types";

// ── Local types ───────────────────────────────────────────────────────────────

type UploadStatus = "uploading" | "uploaded" | "failed";

/** A file the user selected that is being / has been uploaded. */
interface UploadItem {
  localId:         string;
  file:            File;
  previewUrl:      string;
  status:          UploadStatus;
  uploadedImageId: string | null; // UserImage.Id from /api/upload/image
  uploadedUrl:     string | null;
  error:           string | null;
  isCover:         boolean;
  sortOrder:       number;
}

/** An image that already exists on the server (from API). */
interface ExistingItem {
  id:          string;  // PropertyImage.Id
  imageUrl:    string;
  isCover:     boolean;
  order:       number;
  userImageId: string | null;
  imageSource: string;
  deleting:    boolean; // true while delete API call is in-flight
}

/** Passed to parent via onPendingChange so it can call finalizeCreate(). */
export interface PendingImageUpload {
  imageId:   string; // UserImage.Id
  url:       string;
  isCover:   boolean;
  sortOrder: number;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Entity id — when provided the component is in EDIT mode. */
  entityId?:       string;
  entityType?:     "property" | "project";
  /** Existing images (edit mode) — from property/project API response. */
  initialImages?:  PropertyImageResponse[];
  /** Called whenever the pending-upload queue changes (create mode). */
  onPendingChange?: (items: PendingImageUpload[]) => void;
  disabled?:       boolean;
  maxImages?:      number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _counter = 0;
function uid() { return `loc-${++_counter}-${Math.random().toString(36).slice(2, 7)}`; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function PropertyImageUploader({
  entityId,
  entityType = "property",
  initialImages,
  onPendingChange,
  disabled = false,
  maxImages = 10,
}: Props) {
  // Edit-mode: server images
  const [existing, setExisting] = useState<ExistingItem[]>(() =>
    (initialImages ?? [])
      .sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0) || a.order - b.order)
      .map((img) => ({
        id:          img.id,
        imageUrl:    img.imageUrl,
        isCover:     img.isCover ?? img.isPrimary,
        order:       img.order,
        userImageId: img.userImageId ?? null,
        imageSource: img.imageSource ?? (img.userImageId ? "user_upload" : "legacy"),
        deleting:    false,
      }))
  );

  // New uploads (both modes)
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode   = Boolean(entityId);

  // ── Notify parent of pending uploads (create mode) ────────────────────────

  const notifyParent = useCallback(
    (items: UploadItem[]) => {
      if (!onPendingChange) return;
      const ready = items
        .filter((u) => u.status === "uploaded" && u.uploadedImageId)
        .map((u) => ({
          imageId:   u.uploadedImageId!,
          url:       u.uploadedUrl ?? "",
          isCover:   u.isCover,
          sortOrder: u.sortOrder,
        }));
      onPendingChange(ready);
    },
    [onPendingChange]
  );

  // Keep parent in sync whenever uploads change
  useEffect(() => { notifyParent(uploads); }, [uploads, notifyParent]);

  // ── Capacity ──────────────────────────────────────────────────────────────

  const usedSlots = existing.filter((e) => !e.deleting).length + uploads.length;
  const slotsLeft = Math.max(0, maxImages - usedSlots);

  // ── File selection ────────────────────────────────────────────────────────

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).slice(0, slotsLeft);
    if (!arr.length) return;

    const token = tokenStorage.getToken() ?? "";

    // Create pending items immediately so user sees previews
    const newItems: UploadItem[] = arr.map((file, i) => ({
      localId:         uid(),
      file,
      previewUrl:      URL.createObjectURL(file),
      status:          "uploading",
      uploadedImageId: null,
      uploadedUrl:     null,
      error:           null,
      isCover:         usedSlots + i === 0,  // first ever image is cover
      sortOrder:       usedSlots + i,
    }));

    setUploads((prev) => [...prev, ...newItems]);

    // Upload each file independently
    for (const item of newItems) {
      try {
        const info = await imagesService.upload(item.file, token);

        setUploads((prev) =>
          prev.map((u) =>
            u.localId === item.localId
              ? { ...u, status: "uploaded", uploadedImageId: info.id, uploadedUrl: info.url }
              : u
          )
        );

        // In edit mode: attach immediately after upload
        if (isEditMode && entityId) {
          await imagesService.attach(
            { entityId, entityType, imageId: info.id },
            token
          );
          // Refresh existing images from API so we get the PropertyImage.Id
          const fresh = await imagesService.getImages(entityType, entityId, token).catch(() => null);
          if (fresh) {
            setExisting(
              fresh
                .sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0) || a.order - b.order)
                .map((s) => ({
                  id:          s.id,
                  imageUrl:    s.imageUrl,
                  isCover:     s.isCover,
                  order:       s.order,
                  userImageId: s.userImageId,
                  imageSource: s.imageSource,
                  deleting:    false,
                }))
            );
            // Remove this upload from the local list (it's now in existing)
            setUploads((prev) => prev.filter((u) => u.localId !== item.localId));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "فشل الرفع";
        setUploads((prev) =>
          prev.map((u) =>
            u.localId === item.localId ? { ...u, status: "failed", error: msg } : u
          )
        );
      }
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }

  // ── Cover (create mode) ───────────────────────────────────────────────────

  function setUploadCover(localId: string) {
    setUploads((prev) =>
      prev.map((u) => ({ ...u, isCover: u.localId === localId }))
    );
    // Clear existing cover too
    setExisting((prev) => prev.map((e) => ({ ...e, isCover: false })));
  }

  // ── Cover (edit mode) ─────────────────────────────────────────────────────

  async function setExistingCover(id: string) {
    if (!entityId) return;
    const token = tokenStorage.getToken() ?? "";
    setExisting((prev) => prev.map((e) => ({ ...e, isCover: e.id === id })));
    await imagesService.setCover(id, entityType, token).catch(console.error);
  }

  // ── Delete existing (edit mode) ───────────────────────────────────────────

  async function deleteExisting(id: string) {
    if (!entityId) return;
    const token = tokenStorage.getToken() ?? "";
    setExisting((prev) => prev.map((e) => e.id === id ? { ...e, deleting: true } : e));
    try {
      await imagesService.fullDelete(id, entityType, token);
      setExisting((prev) => prev.filter((e) => e.id !== id));
      // Promote cover if needed
      setExisting((prev) => {
        if (prev.some((e) => e.isCover)) return prev;
        if (prev.length === 0) return prev;
        return prev.map((e, i) => ({ ...e, isCover: i === 0 }));
      });
    } catch (err) {
      console.error("[images] delete failed", err);
      setExisting((prev) => prev.map((e) => e.id === id ? { ...e, deleting: false } : e));
    }
  }

  // ── Remove upload (before/after upload, not yet attached) ────────────────

  function removeUpload(localId: string) {
    setUploads((prev) => {
      const next = prev.filter((u) => u.localId !== localId);
      // Re-assign cover if the removed one was cover
      if (next.length > 0 && !next.some((u) => u.isCover)) {
        next[0] = { ...next[0], isCover: true };
      }
      // Re-sort orders
      return next.map((u, i) => ({ ...u, sortOrder: i }));
    });
  }

  // ── Retry failed upload ───────────────────────────────────────────────────

  async function retryUpload(localId: string) {
    const item = uploads.find((u) => u.localId === localId);
    if (!item) return;
    setUploads((prev) =>
      prev.map((u) => u.localId === localId ? { ...u, status: "uploading", error: null } : u)
    );
    const token = tokenStorage.getToken() ?? "";
    try {
      const info = await imagesService.upload(item.file, token);
      setUploads((prev) =>
        prev.map((u) =>
          u.localId === localId
            ? { ...u, status: "uploaded", uploadedImageId: info.id, uploadedUrl: info.url }
            : u
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل الرفع";
      setUploads((prev) =>
        prev.map((u) => u.localId === localId ? { ...u, status: "failed", error: msg } : u)
      );
    }
  }

  // ── Reorder existing (edit mode) ──────────────────────────────────────────

  async function moveExisting(id: string, dir: -1 | 1) {
    if (!entityId) return;
    const idx = existing.findIndex((e) => e.id === id);
    const next = idx + dir;
    if (next < 0 || next >= existing.length) return;

    const reordered = [...existing];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    setExisting(reordered);

    const token = tokenStorage.getToken() ?? "";
    await imagesService
      .reorder(
        {
          entityId,
          entityType,
          items: reordered.map((e, i) => ({ imageId: e.id, sortOrder: i })),
        },
        token
      )
      .catch(console.error);
  }

  // ── Reorder uploads (create mode) ─────────────────────────────────────────

  function moveUpload(localId: string, dir: -1 | 1) {
    setUploads((prev) => {
      const idx = prev.findIndex((u) => u.localId === localId);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((u, i) => ({ ...u, sortOrder: i }));
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalCount = existing.filter((e) => !e.deleting).length + uploads.length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <label className="form-label" style={{ margin: 0 }}>
          صور العقار{" "}
          <span style={{ color: "#94a3b8", fontWeight: 400 }}>(حتى {maxImages} صور)</span>
        </label>
        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
          {totalCount} / {maxImages}
        </span>
      </div>

      {/* Drop zone */}
      {!disabled && slotsLeft > 0 && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed #cbd5e1",
            borderRadius: 10,
            padding: "1.25rem",
            textAlign: "center",
            cursor: "pointer",
            marginBottom: "0.85rem",
            background: "#f8fafc",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>🖼️</div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            اسحب الصور هنا أو{" "}
            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>اضغط للاختيار</span>
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>
            JPG، PNG، WebP — متبقٍ {slotsLeft} من {maxImages}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={onInputChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* Image grid */}
      {(existing.length > 0 || uploads.length > 0) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "0.6rem",
          marginTop: "0.5rem",
        }}>

          {/* ── Existing images (edit mode) ── */}
          {existing.map((img, idx) => (
            <ExistingCard
              key={img.id}
              img={img}
              idx={idx}
              total={existing.length}
              disabled={disabled}
              isEditMode={isEditMode}
              onCover={() => setExistingCover(img.id)}
              onDelete={() => deleteExisting(img.id)}
              onMoveLeft={idx > 0 ? () => moveExisting(img.id, -1) : undefined}
              onMoveRight={idx < existing.length - 1 ? () => moveExisting(img.id, 1) : undefined}
            />
          ))}

          {/* ── New uploads (both modes) ── */}
          {uploads.map((u, idx) => (
            <UploadCard
              key={u.localId}
              item={u}
              idx={idx}
              totalUploads={uploads.length}
              disabled={disabled}
              onSetCover={() => setUploadCover(u.localId)}
              onRemove={() => removeUpload(u.localId)}
              onRetry={() => retryUpload(u.localId)}
              onMoveLeft={idx > 0 ? () => moveUpload(u.localId, -1) : undefined}
              onMoveRight={idx < uploads.length - 1 ? () => moveUpload(u.localId, 1) : undefined}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {existing.length === 0 && uploads.length === 0 && (
        <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "0.25rem 0" }}>
          لا توجد صور بعد — اختر صوراً من الأعلى.
        </p>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ExistingCardProps {
  img:         ExistingItem;
  idx:         number;
  total:       number;
  disabled:    boolean;
  isEditMode:  boolean;
  onCover:     () => void;
  onDelete:    () => void;
  onMoveLeft?:  () => void;
  onMoveRight?: () => void;
}

function ExistingCard({ img, disabled, isEditMode, onCover, onDelete, onMoveLeft, onMoveRight }: ExistingCardProps) {
  return (
    <div style={{
      position: "relative",
      borderRadius: 8,
      overflow: "hidden",
      aspectRatio: "4/3",
      background: "#f1f5f9",
      opacity: img.deleting ? 0.4 : 1,
      transition: "opacity 0.2s",
      border: img.isCover ? "2.5px solid #16a34a" : "1px solid #e2e8f0",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.imageUrl}
        alt="صورة العقار"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Cover badge */}
      {img.isCover && (
        <span style={{
          position: "absolute", top: 4, right: 4,
          background: "#16a34a", color: "#fff",
          fontSize: "0.55rem", fontWeight: 700,
          padding: "2px 6px", borderRadius: 99,
          pointerEvents: "none",
        }}>غلاف</span>
      )}

      {/* Image source badge */}
      {img.imageSource === "user_upload" && (
        <span style={{
          position: "absolute", bottom: 4, right: 4,
          background: "rgba(59,130,246,0.85)", color: "#fff",
          fontSize: "0.5rem", fontWeight: 600,
          padding: "1px 5px", borderRadius: 99,
          pointerEvents: "none",
        }}>R2</span>
      )}

      {/* Overlay buttons */}
      {!img.deleting && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          justifyContent: "flex-start", alignItems: "flex-start",
          padding: "4px",
        }}>
          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            title="حذف الصورة"
            style={btnStyle("#dc2626")}
          >✕</button>
        </div>
      )}

      {/* Bottom row: cover + move */}
      <div style={{
        position: "absolute", bottom: 4, left: 4,
        display: "flex", gap: 3,
      }}>
        {isEditMode && !img.isCover && (
          <button type="button" onClick={onCover} disabled={disabled}
            title="تعيين كغلاف" style={btnStyle("#6366f1", "auto")}>⭐</button>
        )}
        {onMoveLeft && (
          <button type="button" onClick={onMoveLeft} disabled={disabled}
            title="تحريك لليسار" style={btnStyle("#475569", "auto")}>‹</button>
        )}
        {onMoveRight && (
          <button type="button" onClick={onMoveRight} disabled={disabled}
            title="تحريك لليمين" style={btnStyle("#475569", "auto")}>›</button>
        )}
      </div>
    </div>
  );
}

interface UploadCardProps {
  item:          UploadItem;
  idx:           number;
  totalUploads:  number;
  disabled:      boolean;
  onSetCover:    () => void;
  onRemove:      () => void;
  onRetry:       () => void;
  onMoveLeft?:   () => void;
  onMoveRight?:  () => void;
}

function UploadCard({ item, disabled, onSetCover, onRemove, onRetry, onMoveLeft, onMoveRight }: UploadCardProps) {
  const isFailed   = item.status === "failed";
  const isUploading = item.status === "uploading";

  return (
    <div style={{
      position: "relative",
      borderRadius: 8,
      overflow: "hidden",
      aspectRatio: "4/3",
      background: "#f1f5f9",
      border: item.isCover ? "2.5px solid #16a34a" : isFailed ? "2px solid #dc2626" : "1px solid #e2e8f0",
    }}>
      {/* Preview */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.previewUrl}
        alt="معاينة"
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          opacity: isUploading ? 0.5 : isFailed ? 0.35 : 1,
          transition: "opacity 0.2s",
        }}
      />

      {/* Uploading spinner overlay */}
      {isUploading && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.4)",
        }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0ea5e9" }}>
            ⏳ جارٍ الرفع...
          </span>
        </div>
      )}

      {/* Failed overlay */}
      {isFailed && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4,
          background: "rgba(0,0,0,0.5)",
        }}>
          <span style={{ fontSize: "0.62rem", color: "#fca5a5", fontWeight: 600 }}>
            ✕ فشل الرفع
          </span>
          <button type="button" onClick={onRetry}
            style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: 6,
              background: "#fff", border: "none", cursor: "pointer", fontWeight: 700, color: "#dc2626" }}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Cover badge */}
      {item.isCover && !isFailed && (
        <span style={{
          position: "absolute", top: 4, right: 4,
          background: "#16a34a", color: "#fff",
          fontSize: "0.55rem", fontWeight: 700,
          padding: "2px 6px", borderRadius: 99,
          pointerEvents: "none",
        }}>غلاف</span>
      )}

      {/* New badge */}
      {item.status === "uploaded" && (
        <span style={{
          position: "absolute", bottom: 4, right: 4,
          background: "rgba(14,165,233,0.85)", color: "#fff",
          fontSize: "0.5rem", fontWeight: 600,
          padding: "1px 5px", borderRadius: 99,
          pointerEvents: "none",
        }}>جديدة</span>
      )}

      {/* Remove button */}
      <button type="button" onClick={onRemove} disabled={disabled || isUploading}
        title="إزالة" style={{ ...btnStyle("#dc2626"), position: "absolute", top: 4, left: 4 }}>
        ✕
      </button>

      {/* Bottom row: set cover + move */}
      {!isUploading && !isFailed && (
        <div style={{ position: "absolute", bottom: 4, left: 4, display: "flex", gap: 3 }}>
          {!item.isCover && (
            <button type="button" onClick={onSetCover} disabled={disabled}
              title="تعيين كغلاف" style={btnStyle("#6366f1", "auto")}>⭐</button>
          )}
          {onMoveLeft && (
            <button type="button" onClick={onMoveLeft} disabled={disabled}
              title="تحريك لليسار" style={btnStyle("#475569", "auto")}>‹</button>
          )}
          {onMoveRight && (
            <button type="button" onClick={onMoveRight} disabled={disabled}
              title="تحريك لليمين" style={btnStyle("#475569", "auto")}>›</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Style helper ──────────────────────────────────────────────────────────────

function btnStyle(bg: string, width: string | number = 22): React.CSSProperties {
  return {
    background: `${bg}cc`,
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width,
    height: 22,
    cursor: "pointer",
    fontSize: "0.68rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: width === "auto" ? "0 5px" : undefined,
    lineHeight: 1,
  };
}
