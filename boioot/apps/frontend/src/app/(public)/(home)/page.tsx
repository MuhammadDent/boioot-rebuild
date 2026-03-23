"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import MainHeader from "@/components/layout/MainHeader";
import PropertyCard from "@/components/properties/PropertyCard";
import { propertiesApi } from "@/features/properties/api";
import { favoritesApi } from "@/features/favorites/api";
import { api } from "@/lib/api";
import type { PropertyResponse } from "@/types";
import { PROPERTY_TYPE_LABELS } from "@/features/properties/constants";
import { useCities } from "@/hooks/useCities";

// ─── Slider data ──────────────────────────────────────────────────────────────

const SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80",
    title: "شارك طلبك... وحلي العروض تجي لعندك",
    subtitle: "انشر طلبك في قسم الطلبات الخاصة وحلي الملاك والمكاتب بتواصلوا معك.",
    btnText: "ابدأ الآن",
    btnHref: "/properties",
  },
  {
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1600&q=80",
    title: "لأن العقار رحلة... شاركها مع الآخرين",
    subtitle: "في مجتمع بيوت... تواصل مع الآخرين واستفد من تجارياهم.",
    btnText: "اكتشف المجتمع",
    btnHref: "/properties",
  },
  {
    image: "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=1600&q=80",
    title: "ابحث عن منزل أحلامك في سوريا",
    subtitle: "آلاف العقارات المتاحة للبيع والإيجار في مختلف المحافظات السورية.",
    btnText: "تصفح العقارات",
    btnHref: "/properties",
  },
];

// ─── Listing type tabs ────────────────────────────────────────────────────────

const LISTING_TABS = [
  { label: "الكل",           type: "",          listingType: "" },
  { label: "شقق للإيجار",   type: "Apartment", listingType: "Rent" },
  { label: "شقق للبيع",     type: "Apartment", listingType: "Sale" },
  { label: "أراضي للبيع",   type: "Land",      listingType: "Sale" },
  { label: "أراضي للإيجار", type: "Land",      listingType: "Rent" },
  { label: "مكاتب للإيجار", type: "Office",    listingType: "Rent" },
  { label: "مكاتب للبيع",   type: "Office",    listingType: "Sale" },
  { label: "محلات للبيع",   type: "Shop",      listingType: "Sale" },
  { label: "فلل للبيع",     type: "Villa",     listingType: "Sale" },
];

// ─── Pill options ─────────────────────────────────────────────────────────────

const ROOM_OPTIONS = [
  { label: "الكل", value: 0 },
  { label: "1",    value: 1 },
  { label: "2",    value: 2 },
  { label: "3",    value: 3 },
  { label: "4",    value: 4 },
  { label: "5+",   value: 5 },
];

const CATEGORY_OPTIONS = [
  { label: "الكل",   value: "" },
  { label: "عوائل",  value: "family" },
  { label: "عزاب",   value: "single" },
];

const CONTRACT_OPTIONS = [
  { label: "الكل",   value: "" },
  { label: "شهري",  value: "monthly" },
  { label: "سنوي",  value: "yearly" },
];

// ─── Filter state shape ───────────────────────────────────────────────────────

interface FilterState {
  type: string;
  city: string;
  neighborhood: string;
  minBedrooms: number;
  minBathrooms: number;
  category: string;
  contract: string;
  minPrice: string;
  maxPrice: string;
}

const EMPTY_FILTERS: FilterState = {
  type: "", city: "", neighborhood: "",
  minBedrooms: 0, minBathrooms: 0,
  category: "", contract: "",
  minPrice: "", maxPrice: "",
};

// ─── Home page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { cities } = useCities();

  // Slider
  const [slideIndex, setSlideIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tab bar scroll
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // Arrow button disabled state (RTL-aware)
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Hover state for arrow buttons
  const [hoveredArrow, setHoveredArrow] = useState<"prev" | "next" | null>(null);

  // Listing tabs
  const [activeTab, setActiveTab] = useState(0);

  // Filter panel visibility (mobile toggle)
  const [showFilter, setShowFilter] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Draft filters (what user edits before applying)
  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTERS);

  // Applied filters (what drives the API call)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTERS);

  // Neighborhoods list
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);

  // Properties
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // ── Auto-advance slider ─────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  function goSlide(idx: number) { setSlideIndex(idx); startTimer(); }

  // RTL-aware scroll-state checker.
  // In RTL overflow containers (Chrome/Firefox), scrollLeft is ≤ 0:
  //   0        → fully scrolled to the right (RTL start / "الكل" visible)
  //   negative → scrolled toward left (more tabs revealed)
  // We use Math.round to avoid sub-pixel drift.
  const updateScrollBtns = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const sl = Math.round(el.scrollLeft);       // ≤ 0 in RTL
    const overflow = el.scrollWidth - el.clientWidth;
    setCanScrollPrev(sl < 0);                   // content hidden to the right
    setCanScrollNext(Math.abs(sl) < overflow);  // content hidden to the left
  }, []);

  // Initialise on mount and whenever the container resizes.
  useEffect(() => {
    updateScrollBtns();
    const el = tabsScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollBtns);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollBtns]);

  // Scroll the listing-type tab bar.
  // In RTL the visible start is the right side, so:
  //   "prev" → scrolls right (back toward start / الكل)
  //   "next" → scrolls left  (forward to reveal hidden tabs)
  function scrollTabs(dir: "prev" | "next") {
    const el = tabsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "next" ? -220 : 220, behavior: "smooth" });
    // Re-evaluate after the smooth animation finishes (~300 ms).
    setTimeout(updateScrollBtns, 320);
  }

  // ── Load neighborhoods when city changes ────────────────────────────────────

  useEffect(() => {
    if (!draft.city) { setNeighborhoods([]); return; }
    api
      .get<{ id: string; name: string }[]>(`/locations/neighborhoods?city=${encodeURIComponent(draft.city)}`)
      .then((res) => setNeighborhoods(res.map((n) => n.name)))
      .catch(() => setNeighborhoods([]));
  }, [draft.city]);

  // ── Load favorite IDs when authenticated ────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) { setFavoriteIds(new Set()); return; }
    favoritesApi.ids()
      .then(ids => setFavoriteIds(new Set(ids)))
      .catch(() => setFavoriteIds(new Set()));
  }, [isAuthenticated]);

  // ── Load properties when tab or applied filters change ──────────────────────

  useEffect(() => {
    setLoading(true);
    const tab = LISTING_TABS[activeTab];
    propertiesApi
      .getList({
        page: 1,
        pageSize: 8,
        type:         applied.type         || tab.type        || undefined,
        listingType:                          tab.listingType  || undefined,
        city:         applied.city                            || undefined,
        neighborhood: applied.neighborhood                    || undefined,
        minPrice:     applied.minPrice ? Number(applied.minPrice) : undefined,
        maxPrice:     applied.maxPrice ? Number(applied.maxPrice) : undefined,
        minBedrooms:  applied.minBedrooms  || undefined,
        minBathrooms: applied.minBathrooms || undefined,
      })
      .then((res) => {
        setProperties(res.items);
        setTotalCount(res.totalCount);
        setHasNext(res.hasNext);
        setPage(1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTab, applied]);

  function loadMore() {
    const nextPage = page + 1;
    const tab = LISTING_TABS[activeTab];
    propertiesApi
      .getList({
        page: nextPage, pageSize: 8,
        type:         applied.type         || tab.type        || undefined,
        listingType:                          tab.listingType  || undefined,
        city:         applied.city                            || undefined,
        neighborhood: applied.neighborhood                    || undefined,
        minPrice:     applied.minPrice ? Number(applied.minPrice) : undefined,
        maxPrice:     applied.maxPrice ? Number(applied.maxPrice) : undefined,
        minBedrooms:  applied.minBedrooms  || undefined,
        minBathrooms: applied.minBathrooms || undefined,
      })
      .then((res) => {
        setProperties((prev) => [...prev, ...res.items]);
        setHasNext(res.hasNext);
        setPage(nextPage);
      })
      .catch(() => {});
  }

  function applyFilters() { setApplied({ ...draft }); }

  function resetFilters() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setActiveTab(0);
  }

  function setDraftField<K extends keyof FilterState>(k: K, v: FilterState[K]) {
    setDraft((prev) => ({ ...prev, [k]: v }));
  }

  // Client-side search
  const displayed = search.trim()
    ? properties.filter(
        (p) =>
          p.title.includes(search) ||
          p.city?.includes(search) ||
          p.description?.includes(search)
      )
    : properties;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ direction: "rtl", fontFamily: "var(--font-arabic)", background: "var(--color-background)" }}>

      {/* ══ MAIN HEADER ══════════════════════════════════════════════════════════ */}
      <MainHeader />

      {/* ── LISTING TYPE BAR ─────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8ede8", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "0 1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            suppressHydrationWarning
            type="button"
            style={{
              ...arrowBtnStyle,
              opacity: canScrollPrev ? 1 : 0.35,
              cursor: canScrollPrev ? "pointer" : "default",
              background: hoveredArrow === "prev" && canScrollPrev ? "#e8f5e9" : "#fff",
              boxShadow: hoveredArrow === "prev" && canScrollPrev
                ? "0 2px 8px rgba(74,103,65,0.18)"
                : arrowBtnStyle.boxShadow,
              transform: hoveredArrow === "prev" && canScrollPrev ? "scale(1.08)" : "scale(1)",
            }}
            onClick={() => canScrollPrev && scrollTabs("prev")}
            onMouseEnter={() => setHoveredArrow("prev")}
            onMouseLeave={() => setHoveredArrow(null)}
            disabled={!canScrollPrev}
            aria-disabled={!canScrollPrev}
            aria-label="التبويبات السابقة"
            aria-controls="tabs-scroll-bar"
          >
            <span aria-hidden="true">→</span>
          </button>

          <div
            id="tabs-scroll-bar"
            ref={tabsScrollRef}
            role="tablist"
            aria-label="تصفية نوع الإعلانات"
            onScroll={updateScrollBtns}
            style={{ display: "flex", gap: "0.45rem", overflowX: "auto", padding: "0.75rem 0.25rem", flex: 1, scrollbarWidth: "none" }}
          >
            {LISTING_TABS.map((tab, i) => (
              <button
                suppressHydrationWarning
                key={i}
                type="button"
                role="tab"
                aria-selected={i === activeTab}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: "0.38rem 1.1rem",
                  borderRadius: 999,
                  border: i === activeTab ? "none" : "1px solid #e0e7e0",
                  background: i === activeTab ? "var(--color-primary)" : "#f5f7f5",
                  color: i === activeTab ? "#fff" : "var(--color-text-secondary)",
                  fontFamily: "var(--font-arabic)",
                  fontSize: "0.875rem",
                  fontWeight: i === activeTab ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            suppressHydrationWarning
            type="button"
            style={{
              ...arrowBtnStyle,
              opacity: canScrollNext ? 1 : 0.35,
              cursor: canScrollNext ? "pointer" : "default",
              background: hoveredArrow === "next" && canScrollNext ? "#e8f5e9" : "#fff",
              boxShadow: hoveredArrow === "next" && canScrollNext
                ? "0 2px 8px rgba(74,103,65,0.18)"
                : arrowBtnStyle.boxShadow,
              transform: hoveredArrow === "next" && canScrollNext ? "scale(1.08)" : "scale(1)",
            }}
            onClick={() => canScrollNext && scrollTabs("next")}
            onMouseEnter={() => setHoveredArrow("next")}
            onMouseLeave={() => setHoveredArrow(null)}
            disabled={!canScrollNext}
            aria-disabled={!canScrollNext}
            aria-label="التبويبات التالية"
            aria-controls="tabs-scroll-bar"
          >
            <span aria-hidden="true">←</span>
          </button>
        </div>
      </div>

      {/* ── HERO SLIDER ──────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%", height: 460, overflow: "hidden" }}>
        <div style={{
          display: "flex",
          width: `${SLIDES.length * 100}%`,
          height: "100%",
          transform: `translateX(${slideIndex * (100 / SLIDES.length)}%)`,
          transition: "transform 0.6s ease-in-out",
        }}>
          {SLIDES.map((slide, i) => (
            <div key={i} style={{
              width: `${100 / SLIDES.length}%`,
              height: "100%",
              position: "relative",
              flexShrink: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.6) 100%)" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "2rem 3rem", maxWidth: 700 }}>
                <h1 style={{ color: "#fff", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, lineHeight: 1.35, marginBottom: "0.75rem", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                  {slide.title}
                </h1>
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "clamp(0.9rem, 2vw, 1.05rem)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
                  {slide.subtitle}
                </p>
                <Link href={slide.btnHref} style={{ display: "inline-block", padding: "0.7rem 2rem", background: "var(--color-primary)", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "1rem", textDecoration: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", width: "fit-content" }}>
                  {slide.btnText}
                </Link>
              </div>
            </div>
          ))}
        </div>
        <button
          suppressHydrationWarning
          type="button"
          onClick={() => goSlide((slideIndex - 1 + SLIDES.length) % SLIDES.length)}
          style={sliderArrowStyle("right")}
          aria-label="السابق"
        >→</button>
        <button
          suppressHydrationWarning
          type="button"
          onClick={() => goSlide((slideIndex + 1) % SLIDES.length)}
          style={sliderArrowStyle("left")}
          aria-label="التالي"
        >←</button>
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {SLIDES.map((_, i) => (
            <button
              suppressHydrationWarning
              key={i}
              type="button"
              onClick={() => goSlide(i)}
              style={{ width: i === slideIndex ? 24 : 10, height: 10, borderRadius: 999, border: "none", background: i === slideIndex ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", padding: 0, transition: "all 0.3s" }}
              aria-label={`الشريحة ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── SEARCH BAR ───────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--color-border)", padding: "0.75rem 1.25rem" }}>
        <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", position: "relative" }}>
          <input
            suppressHydrationWarning
            type="text"
            placeholder="ابحث في جميع الإعلانات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "0.75rem 3rem 0.75rem 1rem", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: "0.97rem", fontFamily: "var(--font-arabic)", outline: "none", background: "#fafafa" }}
          />
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }}>🔍</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "1.5rem 1.25rem" }} className="home-main-wrap">

        {/* ── Mobile filter toggle ── */}
        <button
          suppressHydrationWarning
          type="button"
          className="home-filter-toggle"
          onClick={() => setShowFilter((v) => !v)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
          {showFilter ? "إخفاء الفلتر" : "فلتر البحث"}
        </button>

        <div className="home-main-layout">
        {/* ── LISTINGS ── */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--color-primary)" }}>
            الإعلانات المتاحة
            {!loading && <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.9rem", marginRight: "0.5rem" }}>({totalCount.toLocaleString("en")})</span>}
          </h2>

          {loading && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
              <div style={{ display: "inline-block", width: 36, height: 36, border: "3px solid var(--color-border)", borderTop: "3px solid var(--color-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          )}

          {!loading && displayed.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🏘️</div>
              <p>لا توجد إعلانات مطابقة حالياً</p>
            </div>
          )}

          {!loading && displayed.length > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
                {displayed.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    initialIsFavorited={favoriteIds.has(p.id)}
                  />
                ))}
              </div>
              {hasNext && (
                <div style={{ textAlign: "center" }}>
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={loadMore}
                    style={{ padding: "0.65rem 2.5rem", border: "1px solid var(--color-primary)", borderRadius: 8, color: "var(--color-primary)", background: "#fff", fontFamily: "var(--font-arabic)", fontSize: "0.95rem", cursor: "pointer", fontWeight: 600 }}
                  >
                    عرض المزيد
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FILTER PANEL ── */}
        <aside className={`home-filter-panel${showFilter ? "" : " home-filter-panel--hidden"}`} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: "1.25rem", position: "sticky", top: 88, maxHeight: "calc(100vh - 110px)", overflowY: "auto" }}>

          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--color-primary)" }}>
            فلتر بحث
          </h3>

          {/* قسم العقار */}
          <FilterSection label="قسم العقار">
            <select
              suppressHydrationWarning
              value={draft.type}
              onChange={(e) => setDraftField("type", e.target.value)}
              style={selectStyle}
            >
              <option value="">الكل</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FilterSection>

          {/* المدينة */}
          <FilterSection label="المدينة">
            <select
              suppressHydrationWarning
              value={draft.city}
              onChange={(e) => { setDraftField("city", e.target.value); setDraftField("neighborhood", ""); }}
              style={selectStyle}
            >
              <option value="">الكل</option>
              {cities.map((c, i) => <option key={`city-${i}-${c}`} value={c}>{c}</option>)}
            </select>
          </FilterSection>

          {/* الحي */}
          <FilterSection label="الحي">
            <select
              suppressHydrationWarning
              value={draft.neighborhood}
              onChange={(e) => setDraftField("neighborhood", e.target.value)}
              disabled={!draft.city}
              style={{ ...selectStyle, opacity: draft.city ? 1 : 0.5 }}
            >
              <option value="">الكل</option>
              {neighborhoods.map((n, i) => <option key={`nbhd-${i}-${n}`} value={n}>{n}</option>)}
            </select>
            {!draft.city && (
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>يرجى اختيار المدينة أولاً</p>
            )}
          </FilterSection>

          {/* عدد الغرف */}
          <FilterSection label="عدد الغرف">
            <PillGroup options={ROOM_OPTIONS} value={draft.minBedrooms} onChange={(v) => setDraftField("minBedrooms", v as number)} />
          </FilterSection>

          {/* عدد دورات المياه */}
          <FilterSection label="عدد دورات المياه">
            <PillGroup options={ROOM_OPTIONS} value={draft.minBathrooms} onChange={(v) => setDraftField("minBathrooms", v as number)} />
          </FilterSection>

          {/* الفئة */}
          <FilterSection label="الفئة">
            <PillGroup options={CATEGORY_OPTIONS} value={draft.category} onChange={(v) => setDraftField("category", v as string)} />
          </FilterSection>

          {/* مدة العقد */}
          <FilterSection label="مدة العقد">
            <PillGroup options={CONTRACT_OPTIONS} value={draft.contract} onChange={(v) => setDraftField("contract", v as string)} />
          </FilterSection>

          {/* السعر */}
          <FilterSection label="السعر">
            <input
              suppressHydrationWarning
              type="number"
              placeholder="السعر الأدنى"
              value={draft.minPrice}
              onChange={(e) => setDraftField("minPrice", e.target.value)}
              min={0}
              style={{ ...selectStyle, marginBottom: "0.4rem" }}
            />
            <input
              suppressHydrationWarning
              type="number"
              placeholder="السعر الأقصى"
              value={draft.maxPrice}
              onChange={(e) => setDraftField("maxPrice", e.target.value)}
              min={0}
              style={selectStyle}
            />
          </FilterSection>

          {/* أزرار التطبيق والإعادة */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              suppressHydrationWarning
              type="button"
              onClick={applyFilters}
              style={{ flex: 1, padding: "0.6rem", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-arabic)", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              تطبيق الفلاتر
            </button>
            <button
              suppressHydrationWarning
              type="button"
              onClick={resetFilters}
              style={{ flex: 1, padding: "0.6rem", background: "#f5f5f5", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", borderRadius: 8, fontFamily: "var(--font-arabic)", fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.46"/></svg>
              إعادة تعيين
            </button>
          </div>

        </aside>
        </div>{/* home-main-layout */}
      </div>{/* home-main-wrap */}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "0.5rem" }}>{label}</p>
      {children}
    </div>
  );
}

function PillGroup({ options, value, onChange }: {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            suppressHydrationWarning
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: 999,
              border: active ? "none" : "1px solid var(--color-border)",
              background: active ? "var(--color-primary)" : "#fff",
              color: active ? "#fff" : "var(--color-text-secondary)",
              fontSize: "0.82rem",
              fontFamily: "var(--font-arabic)",
              fontWeight: active ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const arrowBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: "50%",
  border: "1px solid #e0e7e0", background: "#fff",
  color: "#4a6741", cursor: "pointer", fontSize: "1rem",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
  transition: "box-shadow 0.18s, background 0.18s, transform 0.18s, opacity 0.18s",
};

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.75rem",
  border: "1px solid var(--color-border)", borderRadius: 8,
  fontSize: "0.9rem", fontFamily: "var(--font-arabic)",
  background: "#fff", color: "var(--color-text)", outline: "none",
};

function sliderArrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", top: "50%", [side]: 16, transform: "translateY(-50%)",
    width: 42, height: 42, borderRadius: "50%",
    background: "rgba(255,255,255,0.85)", border: "none", cursor: "pointer",
    fontSize: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)", zIndex: 10, color: "#333",
  };
}
