"use client";

import { useState } from "react";
import StarSelector from "./StarSelector";
import { ratingsApi } from "@/features/ratings/api";
import { normalizeError } from "@/lib/api";
import type { RatingResponse } from "@/types";

interface AddRatingFormProps {
  listingId: string;
  onSuccess: (review: RatingResponse) => void;
}

export default function AddRatingForm({ listingId, onSuccess }: AddRatingFormProps) {
  const [score,     setScore]     = useState(0);
  const [comment,   setComment]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (score === 0) { setError("الرجاء اختيار عدد النجوم"); return; }
    setError("");
    setLoading(true);
    try {
      const result = await ratingsApi.create({
        listingId,
        score,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      onSuccess(result);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          padding: "1rem 1.25rem",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "var(--radius-lg)",
          color: "#15803d",
          fontWeight: 600,
          textAlign: "center",
          fontSize: "0.92rem",
        }}
      >
        ✓ شكراً لك! تم إرسال تقييمك بنجاح.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: "1.25rem",
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
        أضف تقييمك
      </h3>

      {/* Star selector */}
      <div>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--color-text-secondary)" }}>
          التقييم
        </label>
        <StarSelector value={score} onChange={setScore} disabled={loading} />
      </div>

      {/* Comment */}
      <div>
        <label
          htmlFor="rating-comment"
          style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--color-text-secondary)" }}
        >
          تعليقك (اختياري)
        </label>
        <textarea
          id="rating-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          disabled={loading}
          placeholder="شاركنا تجربتك مع هذا العقار..."
          style={{
            width: "100%",
            padding: "0.6rem 0.75rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            background: "var(--color-background)",
            color: "var(--color-text)",
            fontSize: "0.88rem",
            resize: "vertical",
            outline: "none",
            fontFamily: "inherit",
            direction: "rtl",
            boxSizing: "border-box",
          }}
        />
        <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--color-text-secondary)", textAlign: "left" }}>
          {comment.length}/1000
        </p>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-error, #dc2626)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || score === 0}
        className="btn btn-primary"
        style={{ alignSelf: "flex-start" }}
      >
        {loading ? "جاري الإرسال..." : "إرسال التقييم"}
      </button>
    </form>
  );
}
