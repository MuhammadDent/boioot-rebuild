"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { PropertyImageResponse } from "@/types";
import { normalizeImageUrl } from "@/lib/imageUrl";

interface Props {
  images: PropertyImageResponse[];
}

const MAX_VISIBLE_THUMBS = 3;

export default function ImageSlider({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const touchEndX   = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  const prev = useCallback(() =>
    setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1)),
  [images.length]);

  const next = useCallback(() =>
    setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1)),
  [images.length]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0].clientX;
    touchEndX.current   = null;
  }
  function onTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.changedTouches[0].clientX;
  }
  function onTouchEnd() {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) delta > 0 ? next() : prev();
    touchStartX.current = null;
    touchEndX.current   = null;
  }

  if (!images || images.length === 0) {
    return <div className="gallery-empty">🏠</div>;
  }

  const visibleThumbs = images.slice(0, MAX_VISIBLE_THUMBS);

  return (
    <div className="gallery-section">

      {/* ── Desktop: grid layout ── */}
      <div className="gallery-grid">

        {/* Main image — 720 × 720 — uses imageUrl (full-res) */}
        <div
          className="gallery-main"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Image
            src={normalizeImageUrl(images[currentIndex].imageUrl)!}
            alt={`property-image-${currentIndex}`}
            fill
            priority={currentIndex === 0}
            sizes="(max-width: 768px) 100vw, 720px"
            style={{ objectFit: "cover" }}
          />

          {/* Counter */}
          <span className="gallery-counter" dir="ltr">
            {currentIndex + 1} / {images.length}
          </span>

          {/* Prev arrow */}
          <button
            type="button"
            aria-label="الصورة السابقة"
            className="gallery-arrow gallery-arrow--prev"
            onClick={prev}
          >
            ›
          </button>

          {/* Next arrow */}
          <button
            type="button"
            aria-label="الصورة التالية"
            className="gallery-arrow gallery-arrow--next"
            onClick={next}
          >
            ‹
          </button>
        </div>

        {/* Thumbnails column — desktop: right side, max 3 — use thumbnailUrl */}
        {images.length > 1 && (
          <div className="gallery-thumbs-col">
            {visibleThumbs.map((img, i) => (
              <div
                key={img.id}
                className={`gallery-thumb-wrap${i === currentIndex ? " gallery-thumb-wrap--active" : ""}`}
                onClick={() => setCurrentIndex(i)}
              >
                <Image
                  src={normalizeImageUrl(img.thumbnailUrl ?? img.imageUrl)!}
                  alt={`thumbnail-${i}`}
                  fill
                  sizes="220px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile: horizontal thumbnail strip — use thumbnailUrl ── */}
      {images.length > 1 && (
        <div className="gallery-thumbs-strip">
          {images.map((img, i) => (
            <div
              key={img.id}
              className={`gallery-strip-thumb${i === currentIndex ? " gallery-strip-thumb--active" : ""}`}
              onClick={() => setCurrentIndex(i)}
            >
              <Image
                src={normalizeImageUrl(img.thumbnailUrl ?? img.imageUrl)!}
                alt={`thumbnail-${i}`}
                fill
                sizes="72px"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
