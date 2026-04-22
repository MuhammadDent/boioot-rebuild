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

interface ListingRatingsProps {
  listingId: string;
}

export default function ListingRatings({ listingId }: ListingRatingsProps) {
  const { isAuthenticated } = useAuth();

  const [summary,  setSummary]  = useState<RatingSummaryResponse | null>(null);
  const [paged,    setPaged]    = useState<PagedRatingsResponse | null>(null);
  const [canRate,  setCanRate]  = useState(false);
  const [sort,     setSort]     = useState<SortOption>("newest");
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);

  const PAGE_SIZE = 5;

  // Fetch summary (public)
  const fetchSummary = useCallback(async () => {
    try {
      const s = await ratingsApi.getSummary(listingId);
      setSummary(s);
    } catch {
      setSummary({ average: 0, count: 0 });
    }
  }, [listingId]);

  // Fetch paginated reviews (public)
  const fetchReviews = useCallback(async (p: number, s: SortOption) => {
    setLoading(true);
    try {
      const result = await ratingsApi.getForListing(listingId, {
        page: p,
        pageSize: PAGE_SIZE,
        sort: s,
      });
      setPaged(result);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  // Check if user can rate (requires auth)
  const fetchCanRate = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const result = await ratingsApi.canRate(listingId);
      setCanRate(result.canRate);
    } catch {
      setCanRate(false);
    }
  }, [listingId, isAuthenticated]);

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchReviews(1, "newest");
    fetchCanRate();
  }, [fetchSummary, fetchReviews, fetchCanRate]);

  // Re-fetch when sort or page changes
  useEffect(() => {
    fetchReviews(page, sort);
  }, [page, sort, fetchReviews]);

  function handleNewReview(review: RatingResponse) {
    setCanRate(false);
    // Prepend new review to the list and update summary optimistically
    setPaged((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [review, ...prev.items.slice(0, PAGE_SIZE - 1)],
        total: prev.total + 1,
      };
    });
    fetchSummary();
  }

  const totalPages = paged ? Math.ceil(paged.total / PAGE_SIZE) : 0;

  return (
    <section style={{ marginTop: "2.5rem", paddingTop: "2.5rem", borderTop: "1px solid var(--color-border)" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
        التقييمات والمراجعات
      </h2>

      {/* Summary block */}
      {summary && <RatingsSummary summary={summary} />}

      {/* Add rating form — only if user can rate */}
      {canRate && (
        <div style={{ marginTop: "1.25rem" }}>
          <AddRatingForm listingId={listingId} onSuccess={handleNewReview} />
        </div>
      )}

      {/* Reviews list */}
      {(paged?.total ?? 0) > 0 && (
        <div style={{ marginTop: "1.5rem" }}>

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
                  background: sort === s ? "var(--color-primary)" : "transparent",
                  color: sort === s ? "#fff" : "var(--color-text)",
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

          {/* Cards */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ height: 80, borderRadius: "var(--radius-lg)", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", opacity: 0.5, animation: "pulse 1.5s infinite" }}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {paged?.items.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}

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
        </div>
      )}
    </section>
  );
}
