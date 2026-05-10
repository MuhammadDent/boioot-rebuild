"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import AgencyCard, { type AgencyListItem } from "@/components/agencies/AgencyCard";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import SectionDisabled from "@/components/ui/SectionDisabled";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FilterForm {
  province:   string;
  city:       string;
  type:       string;
  isVerified: string;
  isFeatured: string;
}

const EMPTY_FILTERS: FilterForm = { province: "", city: "", type: "", isVerified: "", isFeatured: "" };

interface AgenciesPagedResult {
  items:      AgencyListItem[];
  page:       number;
  pageSize:   number;
  totalCount: number;
  totalPages: number;
}

interface CityOption {
  id:         string;
  name:       string;
  isVerified?: boolean;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchAgencies(params: Record<string, string>): Promise<AgenciesPagedResult> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""))
  ).toString();
  const res = await fetch(`/api/agencies${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error("فشل تحميل البيانات");
  return res.json();
}

// Fetch provinces from the locations API (DB-driven, not hardcoded)
async function fetchProvinces(): Promise<string[]> {
  try {
    const res = await fetch("/api/locations/provinces", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

// Fetch cities for a province from the locations API (verified-first order)
async function fetchCitiesForProvince(province: string): Promise<CityOption[]> {
  try {
    const res = await fetch(`/api/locations/cities?province=${encodeURIComponent(province)}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

// ── Skeleton grid ─────────────────────────────────────────────────────────────

function AgencyCardSkeleton() {
  return (
    <div style={{
      background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14,
      padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
    }}>
      {[80, 60, 100, 40].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 60 : 16, width: `${w}%`,
          background: "#f1f5f9", borderRadius: 8, animation: "pulse 1.5s infinite",
        }} />
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  onReset,
  filtered,
  provinceOnly,
  provinceName,
}: {
  onReset:      () => void;
  filtered:     boolean;
  provinceOnly: boolean;
  provinceName: string;
}) {
  const message = provinceOnly
    ? `لا توجد مكاتب أو وسطاء في ${provinceName} حاليًا`
    : filtered
    ? "لا توجد نتائج مطابقة"
    : "لا توجد مكاتب أو وسطاء متاحون حالياً";

  const hint = provinceOnly
    ? "يمكنك تصفح المكاتب في محافظة أخرى أو عرض الكل."
    : filtered
    ? "جرّب تعديل الفلاتر أو إعادة الضبط."
    : "سيتم إضافة المكاتب والوسطاء قريباً.";

  return (
    <div style={{
      textAlign: "center", padding: "4rem 1rem",
      color: "#64748b", gridColumn: "1 / -1",
    }}>
      <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🏢</div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.5rem" }}>
        {message}
      </h3>
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem" }}>{hint}</p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        {filtered && (
          <button onClick={onReset} className="btn btn-primary" style={{ padding: "0.5rem 1.25rem" }}>
            إعادة ضبط الفلاتر
          </button>
        )}
        <a href="/properties" className="btn" style={{ padding: "0.5rem 1.25rem", textDecoration: "none" }}>
          تصفح العقارات
        </a>
      </div>
    </div>
  );
}

// ── Select style helper ───────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = { padding: "0.45rem 0.75rem" };

// ── Inner (needs Suspense for useSearchParams) ────────────────────────────────

function AgenciesContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const { settings, isLoading: settingsLoading } = useSiteSettings();

  const provinceParam   = searchParams.get("province")   || "";
  const cityParam       = searchParams.get("city")       || "";
  const typeParam       = searchParams.get("type")       || "";
  const isVerifiedParam = searchParams.get("isVerified") || "";
  const isFeaturedParam = searchParams.get("isFeatured") || "";
  const pageParam       = Number(searchParams.get("page") || "1");

  const [form, setForm] = useState<FilterForm>({
    province: provinceParam, city: cityParam, type: typeParam,
    isVerified: isVerifiedParam, isFeatured: isFeaturedParam,
  });

  const [agencies,       setAgencies]       = useState<AgencyListItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [totalCount,     setTotalCount]     = useState(0);
  const [totalPages,     setTotalPages]     = useState(1);

  // DB-driven province and city lists (no hardcoded values)
  const [provinces,      setProvinces]      = useState<string[]>([]);
  const [provinceCities, setProvinceCities] = useState<CityOption[]>([]);
  const [citiesLoading,  setCitiesLoading]  = useState(false);

  // Load provinces once on mount
  useEffect(() => {
    fetchProvinces().then(setProvinces);
  }, []);

  // Sync form when URL changes
  useEffect(() => {
    setForm({ province: provinceParam, city: cityParam, type: typeParam, isVerified: isVerifiedParam, isFeatured: isFeaturedParam });
  }, [provinceParam, cityParam, typeParam, isVerifiedParam, isFeaturedParam]);

  // Load cities from API whenever province filter changes (verified-first order)
  useEffect(() => {
    setProvinceCities([]);
    if (!provinceParam) return;
    setCitiesLoading(true);
    fetchCitiesForProvince(provinceParam)
      .then(setProvinceCities)
      .finally(() => setCitiesLoading(false));
  }, [provinceParam]);

  // Fetch agencies
  useEffect(() => {
    setLoading(true);
    setError("");
    fetchAgencies({
      province: provinceParam, city: cityParam, type: typeParam,
      isVerified: isVerifiedParam, isFeatured: isFeaturedParam,
      page: String(pageParam), pageSize: "12",
    })
      .then(data => {
        setAgencies(data.items);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      })
      .catch(() => setError("تعذّر تحميل البيانات، حاول مجدداً."))
      .finally(() => setLoading(false));
  }, [provinceParam, cityParam, typeParam, isVerifiedParam, isFeaturedParam, pageParam]);

  // Section guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (mounted && !settingsLoading && !settings.sectionAgenciesEnabled) {
    return <SectionDisabled />;
  }

  function pushFilter(patch: Partial<FilterForm>) {
    const next = { ...form, ...patch };
    if (patch.province !== undefined && patch.province !== form.province) {
      next.city = "";
    }
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries({ ...next, page: "1" }).filter(([, v]) => v !== ""))
    ).toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function handleReset() {
    setForm(EMPTY_FILTERS);
    router.push(pathname);
  }

  function goPage(p: number) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries({ ...form, page: String(p) }).filter(([, v]) => v !== ""))
    ).toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isFiltered  = !!(provinceParam || cityParam || typeParam || isVerifiedParam || isFeaturedParam);
  const provinceOnly = !!(provinceParam && !cityParam && !typeParam && !isVerifiedParam && !isFeaturedParam);

  return (
    <div dir="rtl" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
          المكاتب والوسطاء
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.92rem" }}>
          تصفح المكاتب والوسطاء العقاريين المعتمدين وتواصل معهم مباشرة.
          {totalCount > 0 && !loading && (
            <span style={{ marginRight: "0.5rem", fontWeight: 600, color: "#0f766e" }}>
              ({totalCount} نتيجة)
            </span>
          )}
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
        padding: "1rem 1.25rem", marginBottom: "1.5rem",
        display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end",
      }}>

        {/* Province — DB-driven list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 140px" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>المحافظة</label>
          <select
            className="form-input"
            style={selectStyle}
            value={form.province}
            onChange={e => pushFilter({ province: e.target.value })}
          >
            <option value="">كل المحافظات</option>
            {provinces.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* City — DB-driven, verified first, shows (مستخدم) for user-added */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 140px" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>المدينة</label>
          <select
            className="form-input"
            style={selectStyle}
            value={form.city}
            onChange={e => pushFilter({ city: e.target.value })}
            disabled={!provinceParam || citiesLoading}
          >
            <option value="">
              {citiesLoading ? "جاري التحميل..." : (provinceParam ? "كل المدن" : "اختر محافظة أولاً")}
            </option>
            {provinceCities.map(c => (
              <option key={c.id} value={c.name}>
                {c.isVerified === false ? `${c.name} ✦` : c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 140px" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>النوع</label>
          <select
            className="form-input"
            style={selectStyle}
            value={form.type}
            onChange={e => pushFilter({ type: e.target.value })}
          >
            <option value="">الكل</option>
            <option value="Office">مكتب عقاري</option>
            <option value="Broker">وسيط عقاري</option>
          </select>
        </div>

        {/* Verified */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 120px" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>التوثيق</label>
          <select
            className="form-input"
            style={selectStyle}
            value={form.isVerified}
            onChange={e => pushFilter({ isVerified: e.target.value })}
          >
            <option value="">الكل</option>
            <option value="true">موثق فقط</option>
          </select>
        </div>

        {/* Featured */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 120px" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>الظهور</label>
          <select
            className="form-input"
            style={selectStyle}
            value={form.isFeatured}
            onChange={e => pushFilter({ isFeatured: e.target.value })}
          >
            <option value="">الكل</option>
            <option value="true">مميز فقط</option>
          </select>
        </div>

        {isFiltered && (
          <button
            onClick={handleReset}
            className="btn"
            style={{ padding: "0.45rem 1rem", alignSelf: "flex-end" }}
          >
            إعادة ضبط
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <p style={{ color: "#dc2626", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</p>
      )}

      {/* ── Grid ── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap:                 "1.25rem",
      }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <AgencyCardSkeleton key={i} />)
        ) : agencies.length === 0 ? (
          <EmptyState
            onReset={handleReset}
            filtered={isFiltered}
            provinceOnly={provinceOnly}
            provinceName={provinceParam}
          />
        ) : (
          agencies.map(a => <AgencyCard key={a.id} agency={a} />)
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: "flex", justifyContent: "center",
          gap: "0.5rem", marginTop: "2rem", flexWrap: "wrap",
        }}>
          <button
            onClick={() => goPage(pageParam - 1)}
            disabled={pageParam <= 1}
            className="btn"
            style={{ padding: "0.45rem 1rem" }}
          >
            ← السابق
          </button>
          <span style={{
            padding: "0.45rem 1rem", fontSize: "0.85rem",
            color: "#64748b", alignSelf: "center",
          }}>
            صفحة {pageParam} من {totalPages}
          </span>
          <button
            onClick={() => goPage(pageParam + 1)}
            disabled={pageParam >= totalPages}
            className="btn"
            style={{ padding: "0.45rem 1rem" }}
          >
            التالي →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function AgenciesPage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
        <div style={{ height: 40, background: "#f1f5f9", borderRadius: 8, marginBottom: "1rem", width: "40%" }} />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              height: 220, background: "#f1f5f9", borderRadius: 14,
              animation: "pulse 1.5s infinite",
            }} />
          ))}
        </div>
      </div>
    }>
      <AgenciesContent />
    </Suspense>
  );
}
