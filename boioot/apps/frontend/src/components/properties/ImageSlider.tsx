"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { PropertyImageResponse } from "@/types";

interface Props {
  images: PropertyImageResponse[];
}

export default function ImageSlider({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const touchEndX   = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  const clamp = (n: number) => Math.max(0, Math.min(n, images.length - 1));

  const prev = useCallback(() => setCurrentIndex((i) => {
    if (i === 0) return images.length - 1;
    return clamp(i - 1);
  }), [images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => setCurrentIndex((i) => {
    if (i === images.length - 1) return 0;
    return clamp(i + 1);
  }), [images.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return <div className="img-slider__empty">🏠</div>;
  }

  const active = images[currentIndex];

  return (
    <div className="img-slider">

      {/* ── Main frame + thumbnails side-by-side ── */}
      <div className="img-slider__layout">

        {/* Main image */}
        <div
          className="img-slider__frame"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Image
            src={active.imageUrl}
            alt={`صورة العقار ${currentIndex + 1}`}
            fill
            priority={currentIndex === 0}
            sizes="(max-width: 768px) 100vw, 660px"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />

          {/* Counter — top-start (RTL: top-right) */}
          <span className="img-slider__counter">
            {currentIndex + 1} / {images.length}
          </span>

          {/* Prev arrow — RTL: right side */}
          <button
            type="button"
            aria-label="الصورة السابقة"
            className="img-slider__arrow img-slider__arrow--prev"
            onClick={prev}
          >
            ›
          </button>

          {/* Next arrow — RTL: left side */}
          <button
            type="button"
            aria-label="الصورة التالية"
            className="img-slider__arrow img-slider__arrow--next"
            onClick={next}
          >
            ‹
          </button>
        </div>

        {/* Vertical thumbnail strip — right side */}
        {images.length > 1 && (
          <div className="img-slider__thumbs">
            {images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.thumbnailUrl ?? img.imageUrl}
                alt={`معاينة ${i + 1}`}
                className={`img-slider__thumb${i === currentIndex ? " img-slider__thumb--active" : ""}`}
                onClick={() => setCurrentIndex(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Dots — centered below main image ── */}
      {images.length > 1 && (
        <div className="img-slider__dots">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`انتقل إلى الصورة ${i + 1}`}
              className={`img-slider__dot${i === currentIndex ? " img-slider__dot--active" : ""}`}
              onClick={() => setCurrentIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
