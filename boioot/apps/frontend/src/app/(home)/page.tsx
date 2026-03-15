"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import PropertyCard from "@/components/properties/PropertyCard";
import { propertiesApi } from "@/features/properties/api";
import type { PropertyResponse } from "@/types";
import { SYRIAN_CITIES, PROPERTY_TYPE_LABELS } from "@/features/properties/constants";

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

// ─── Section nav links ────────────────────────────────────────────────────────

const SECTION_LINKS = [
  { label: "الرئيسية",       href: "/" },
  { label: "الإيجار اليومي", href: "/daily-rentals" },
  { label: "العقارات",       href: "/properties" },
  { label: "المشاريع",       href: "/projects" },
];

// ─── Home page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  // Slider state
  const [slideIndex, setSlideIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active listing tab
  const [activeTab, setActiveTab] = useState(0);

  // Search query
  const [search, setSearch] = useState("");

  // Filter state
  const [filterType, setFilterType] = useState("");
  const [filterCity, setFilterCity] = useState("");

  // Properties
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  // ── Auto-advance slider ────────────────────────────────────────────────────

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

  function goSlide(idx: number) {
    setSlideIndex(idx);
    startTimer();
  }

  // ── Load properties ────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    const tab = LISTING_TABS[activeTab];
    propertiesApi
      .getList({
        page: 1,
        pageSize: 8,
        type: filterType || tab.type || undefined,
        listingType: tab.listingType || undefined,
        city: filterCity || undefined,
      })
      .then((res) => {
        setProperties(res.items);
        setTotalCount(res.totalCount);
        setHasNext(res.hasNext);
        setPage(1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTab, filterType, filterCity]);

  function loadMore() {
    const nextPage = page + 1;
    const tab = LISTING_TABS[activeTab];
    propertiesApi
      .getList({
        page: nextPage,
        pageSize: 8,
        type: filterType || tab.type || undefined,
        listingType: tab.listingType || undefined,
        city: filterCity || undefined,
      })
      .then((res) => {
        setProperties((prev) => [...prev, ...res.items]);
        setHasNext(res.hasNext);
        setPage(nextPage);
      })
      .catch(() => {});
  }

  // ── Filter by search (client-side) ────────────────────────────────────────

  const displayed = search.trim()
    ? properties.filter(
        (p) =>
          p.title.includes(search) ||
          p.city?.includes(search) ||
          p.description?.includes(search)
      )
    : properties;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ direction: "rtl", fontFamily: "var(--font-arabic)", minHeight: "100vh", background: "var(--color-background)" }}>

      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <header style={{ background: "#fff", borderBottom: "1px solid var(--color-border)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "0 1.25rem", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>

          {/* Logo — RTL start */}
          <Link href="/" style={{ flexShrink: 0 }}>
            <Image src="/logo-boioot.png" alt="بيوت" width={96} height={38} style={{ objectFit: "contain" }} priority />
          </Link>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/projects" style={btnStyle("outline")}>المشاريع العقارية</Link>
            <Link href="/properties" style={btnStyle("green")}>أضف إعلانك</Link>
            <Link href="/properties" style={btnStyle("dark")}>أضف طلب</Link>
          </div>

          {/* User icons */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {!isLoading && (
              isAuthenticated ? (
                <>
                  <Link href="/dashboard" title="لوحة التحكم" style={iconBtnStyle}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </Link>
                  <button style={{ ...iconBtnStyle, color: "#e53935", background: "none", border: "none", cursor: "pointer" }} title="المفضلة">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  </button>
                  <button style={{ ...iconBtnStyle, background: "none", border: "none", cursor: "pointer" }} title="الإشعارات">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", textDecoration: "none" }}>تسجيل الدخول</Link>
                  <Link href="/register" style={btnStyle("green")}>إنشاء حساب</Link>
                </>
              )
            )}
          </div>

        </div>
      </header>

      {/* ── SECTION NAV ─────────────────────────────────────────────────────── */}
      <nav style={{ background: "#f1f8f1", borderBottom: "1px solid #c8e6c9" }}>
        <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "0 1.25rem", display: "flex", gap: 0, overflowX: "auto" }}>
          {SECTION_LINKS.map((link) => {
            const active = typeof window !== "undefined" && window.location.pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.95rem",
                  fontWeight: link.href === "/" ? 700 : 500,
                  color: link.href === "/" ? "var(--color-primary)" : "var(--color-text-secondary)",
                  borderBottom: link.href === "/" ? "3px solid var(--color-primary)" : "3px solid transparent",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── LISTING TYPE BAR ─────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={() => {}} style={arrowBtnStyle}>&#8592;</button>
          <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", padding: "0.6rem 0", flex: 1, scrollbarWidth: "none" }}>
            {LISTING_TABS.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: "0.35rem 1rem",
                  borderRadius: 999,
                  border: i === activeTab ? "none" : "1px solid var(--color-border)",
                  background: i === activeTab ? "var(--color-primary)" : "#fff",
                  color: i === activeTab ? "#fff" : "var(--color-text-secondary)",
                  fontFamily: "var(--font-arabic)",
                  fontSize: "0.88rem",
                  fontWeight: i === activeTab ? 700 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={() => {}} style={arrowBtnStyle}>&#8594;</button>
        </div>
      </div>

      {/* ── HERO SLIDER ──────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%", height: 460, overflow: "hidden" }}>

        {/* Slides */}
        <div
          style={{
            display: "flex",
            width: `${SLIDES.length * 100}%`,
            height: "100%",
            transform: `translateX(${slideIndex * (100 / SLIDES.length)}%)`,
            transition: "transform 0.6s ease-in-out",
          }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              style={{
                width: `${100 / SLIDES.length}%`,
                height: "100%",
                position: "relative",
                flexShrink: 0,
                backgroundImage: `url(${slide.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Dark overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.65) 100%)" }} />

              {/* Content */}
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "2rem 3rem", maxWidth: 700 }}>
                <h1 style={{ color: "#fff", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, lineHeight: 1.35, marginBottom: "0.75rem", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                  {slide.title}
                </h1>
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "clamp(0.9rem, 2vw, 1.05rem)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
                  {slide.subtitle}
                </p>
                <div>
                  <Link href={slide.btnHref} style={{ display: "inline-block", padding: "0.7rem 2rem", background: "var(--color-primary)", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "1rem", textDecoration: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    {slide.btnText}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Prev arrow */}
        <button
          onClick={() => goSlide((slideIndex - 1 + SLIDES.length) % SLIDES.length)}
          style={sliderArrowStyle("right")}
          aria-label="السابق"
        >
          &#8250;
        </button>

        {/* Next arrow */}
        <button
          onClick={() => goSlide((slideIndex + 1) % SLIDES.length)}
          style={sliderArrowStyle("left")}
          aria-label="التالي"
        >
          &#8249;
        </button>

        {/* Dots */}
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goSlide(i)}
              style={{
                width: i === slideIndex ? 24 : 10,
                height: 10,
                borderRadius: 999,
                border: "none",
                background: i === slideIndex ? "#fff" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s",
              }}
              aria-label={`الشريحة ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── SEARCH BAR ───────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--color-border)", padding: "0.75rem 1.25rem" }}>
        <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", position: "relative" }}>
          <input
            type="text"
            placeholder="ابحث في جميع الإعلانات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 3rem 0.75rem 1rem",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: "0.97rem",
              fontFamily: "var(--font-arabic)",
              outline: "none",
              background: "#fafafa",
            }}
          />
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }}>
            🔍
          </span>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "1.5rem 1.25rem", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>

        {/* ── LISTINGS (2/3) ── */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>

          {/* Section heading */}
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--color-primary)" }}>
            الإعلانات المتاحة
            {!loading && <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.9rem", marginRight: "0.5rem" }}>({totalCount.toLocaleString("ar-SY")})</span>}
          </h2>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
              <div style={{ display: "inline-block", width: 36, height: 36, border: "3px solid var(--color-border)", borderTop: "3px solid var(--color-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          )}

          {/* Empty state */}
          {!loading && displayed.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🏘️</div>
              <p>لا توجد إعلانات مطابقة حالياً</p>
            </div>
          )}

          {/* Property cards — 2-column grid */}
          {!loading && displayed.length > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
                {displayed.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>

              {hasNext && (
                <div style={{ textAlign: "center" }}>
                  <button
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

        {/* ── FILTER PANEL (1/3) ── */}
        <aside style={{ width: 260, flexShrink: 0, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: "1.25rem", position: "sticky", top: 100 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "1rem", borderBottom: "2px solid var(--color-primary)", paddingBottom: "0.5rem" }}>
            فلتر بحث
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-text-secondary)" }}>قسم العقار</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={selectStyle}
            >
              <option value="">الكل</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--color-text-secondary)" }}>المدينة</label>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              style={selectStyle}
            >
              <option value="">الكل</option>
              {SYRIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => { setFilterType(""); setFilterCity(""); setActiveTab(0); }}
            style={{ width: "100%", padding: "0.6rem", border: "1px solid var(--color-border)", borderRadius: 8, background: "#f9f9f9", fontFamily: "var(--font-arabic)", fontSize: "0.9rem", cursor: "pointer", color: "var(--color-text-secondary)" }}
          >
            مسح الفلاتر
          </button>

          <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
            <Link
              href="/properties"
              style={{ display: "block", textAlign: "center", padding: "0.65rem", background: "var(--color-primary)", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}
            >
              بحث متقدم
            </Link>
          </div>
        </aside>

      </div>

      {/* Spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function btnStyle(variant: "green" | "dark" | "outline"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.4rem 0.9rem",
    borderRadius: 8,
    fontSize: "0.88rem",
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
    cursor: "pointer",
    fontFamily: "var(--font-arabic)",
    border: "none",
    transition: "opacity 0.15s",
  };
  if (variant === "green") return { ...base, background: "var(--color-primary)", color: "#fff" };
  if (variant === "dark")  return { ...base, background: "var(--color-primary-dark)", color: "#fff" };
  return { ...base, background: "#fff", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" };
}

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  borderRadius: "50%",
  background: "#f5f5f5",
  color: "var(--color-text-secondary)",
  textDecoration: "none",
};

const arrowBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: "1px solid var(--color-border)",
  background: "#fff",
  color: "var(--color-text)",
  cursor: "pointer",
  fontSize: "1rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: "0.9rem",
  fontFamily: "var(--font-arabic)",
  background: "#fff",
  color: "var(--color-text)",
  outline: "none",
};

function sliderArrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 16,
    transform: "translateY(-50%)",
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.85)",
    border: "none",
    cursor: "pointer",
    fontSize: "1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    zIndex: 10,
    color: "#333",
  };
}
