"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { ratingsApi } from "@/features/ratings/api";
import type { RatingResponse, RatingSummaryResponse, PagedRatingsResponse } from "@/types";
import RatingsSummary from "./RatingsSummary";
import ReviewCard from "./ReviewCard";
import AddRatingForm from "./AddRatingForm";

type SortOption = "newest" | "highest" | "lowest";

const SORT_LABELS: Record<SortOption, string> = {
  newest:  "الأحدث",
  highest: "الأعلى تقييماً",
  lowest:  "الأدنى تقييماً",
};

const PAGE_SIZE = 5;

interface ListingRatingsProps {
  listingId: string;
}

export default function ListingRatings({ listingId }: ListingRatingsProps) {
  const { isAuthenticated } = useAuth();

  const [summary,      setSummary]      = useState<RatingSummaryResponse | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [paged,        setPaged]        = useState<PagedRatingsResponse | null>(null);
  const [reviewsError, setReviewsError] = useState(false);
  const [canRate,      setCanRate]      = useState(false);
  const [sort,         setSort]         = useState<SortOption>("newest");
  const [page,         setPage]         = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ── Fetch summary (public, always shown) ────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(false);
    try {
      const s = await ratingsApi.getSummary(listingId);
      console.log("[Ratings] summary:", s);
      setSummary(s);
    } catch (err) {
      console.warn("[Ratings] summary fetch failed:", err);
      setSummaryError(true);
      setSummary({ average: 0, count: 0 });
    } finally {
      setSummaryLoading(false);
    }
  }, [listingId]);

  // ── Fetch paginated reviews (public, always shown) ───────────────────────────
  const fetchReviews = useCallback(async (p: number, s: SortOption) => {
    setReviewsLoading(true);
    setReviewsError(false);
    try {
      const result = await ratingsApi.getForListing(listingId, {
        page: p,
        pageSize: PAGE_SIZE,
        sort: s,
      });
      console.log(`[Ratings] reviews (page=${p}, sort=${s}):`, result);
      setPaged(result);
    } catch (err) {
      console.warn("[Ratings] reviews fetch failed:", err);
      setReviewsError(true);
    } finally {
      setReviewsLoading(false);
    }
  }, [listingId]);

  // ── Check eligibility (requires auth) ────────────────────────────────────────
  const fetchCanRate = useCallback(async () => {
    if (!isAuthenticated) {
      console.log("[Ratings] canRate: skipped (not authenticated)");
      return;
    }
    try {
      const result = await ratingsApi.canRate(listingId);
      console.log("[Ratings] canRate response:", result);
      setCanRate(result.canRate);
    } catch (err) {
      console.warn("[Ratings] canRate fetch failed:", err);
      setCanRate(false);
    }
  }, [listingId, isAuthenticated]);

  // ── Initial load: summary + canRate only ────────────────────────────────────
  // Reviews are handled by the sort/page effect below (avoids double-fetch).
  useEffect(() => {
    fetchSummary();
    fetchCanRate();
  }, [fetchSummary, fetchCanRate]);

  // ── Reviews: load on mount and whenever page/sort changes ───────────────────
  useEffect(() => {
    fetchReviews(page, sort);
  }, [page, sort, fetchReviews]);

  // ── Handle successful new review submission ──────────────────────────────────
  function handleNewReview(review: RatingResponse) {
    setCanRate(false);

    // Optimistic: prepend the new review and increment total
    setPaged((prev) => {
      if (!prev) {
        // No reviews existed yet — bootstrap the paged result
        return { items: [review], total: 1, page: 1, pageSize: PAGE_SIZE };
      }
      return {
        ...prev,
        items:  [review, ...prev.items.slice(0, PAGE_SIZE - 1)],
        total:  prev.total + 1,
      };
    });

    // Re-fetch the authoritative summary from the server
    fetchSummary();
  }

  const totalPages = paged ? Math.ceil(paged.total / PAGE_SIZE) : 0;
  const hasReviews = (paged?.total ?? 0) > 0;

  return (
    <section
      aria-label="التقييمات والمراجعات"
      style={{ marginTop: "2.5rem", paddingTop: "2.5rem", borderTop: "1px solid var(--color-border)" }}
    >
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
        التقييمات والمراجعات
      </h2>

      {/* ── Summary (always visible) ── */}
      {summaryLoading ? (
        <div
          style={{
            height: 72,
            borderRadius: "var(--radius-lg)",
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            opacity: 0.5,
          }}
        />
      ) : summaryError ? (
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
          تعذّر تحميل الملخص.
        </p>
      ) : (
        summary && <RatingsSummary summary={summary} />
      )}

      {/* ── Add rating form (only when canRate = true) ── */}
      {canRate && (
        <div style={{ marginTop: "1.25rem" }}>
          <AddRatingForm listingId={listingId} onSuccess={handleNewReview} />
        </div>
      )}

      {/* ── Reviews list (always visible when reviews exist) ── */}
      <div style={{ marginTop: "1.5rem" }}>

        {reviewsLoading ? (
          /* Skeleton */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 80,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-bg-card)",
                  border: "1px solid var(--color-border)",
                  opacity: 0.4,
                }}
              />
            ))}
          </div>
        ) : reviewsError ? (
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            تعذّر تحميل التقييمات.
          </p>
        ) : !hasReviews ? (
          /* Empty state */
          <p style={{
            fontSize: "0.88rem",
            color: "var(--color-text-secondary)",
            padding: "1rem",
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            textAlign: "center",
          }}>
            لا توجد تقييمات بعد. كن أول من يقيّم هذا العقار!
          </p>
        ) : (
          <>
            {/* Sort toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>ترتيب حسب:</span>
              {(["newest", "highest", "lowest"] as SortOption[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSort(s); setPage(1); }}
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid",
                    borderColor: sort === s ? "var(--color-primary)" : "var(--color-border)",
                    background:  sort === s ? "var(--color-primary)" : "transparent",
                    color:       sort === s ? "#fff" : "var(--color-text)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {SORT_LABELS[s]}
                </button>
              ))}
            </div>

            {/* Review cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {paged?.items.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-outline"
                  style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
                >
                  ← السابق
                </button>
                <span style={{ display: "flex", alignItems: "center", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-outline"
                  style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem" }}
                >
                  التالي →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
