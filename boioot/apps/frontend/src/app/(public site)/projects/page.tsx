"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import ProjectCard from "@/components/projects/ProjectCard";
import { projectsApi, PROJECTS_PAGE_SIZE } from "@/features/projects/api";
import { PROJECT_STATUS_LABELS } from "@/features/projects/constants";
import { useCities } from "@/hooks/useCities";
import type { ProjectResponse } from "@/types";

// ─── Filter form shape ────────────────────────────────────────────────────────

interface FilterForm {
  city: string;
  status: string;
}

const EMPTY_FILTERS: FilterForm = { city: "", status: "" };

// ─── Inner component (needs Suspense because it uses useSearchParams) ─────────

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const { cities }   = useCities();

  // Applied filter values — derived from URL, used for fetching
  const cityParam   = searchParams.get("city")   || "";
  const statusParam = searchParams.get("status") || "";
  const pageParam   = Number(searchParams.get("page") || "1");

  // Draft filter state — local form values before the user submits
  const [form, setForm] = useState<FilterForm>({
    city:   cityParam,
    status: statusParam,
  });

  const [projects, setProjects]     = useState<ProjectResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext]       = useState(false);
  const [hasPrev, setHasPrev]       = useState(false);

  // Sync draft form when URL changes externally (browser back/forward)
  useEffect(() => {
    setForm({ city: cityParam, status: statusParam });
  }, [cityParam, statusParam]);

  // Fetch data whenever the applied URL params change
  useEffect(() => {
    setLoading(true);
    setError("");

    projectsApi
      .getList({
        page:     pageParam,
        pageSize: PROJECTS_PAGE_SIZE,
        city:     cityParam   || undefined,
        status:   statusParam || undefined,
      })
      .then((res) => {
        setProjects(res.items);
        setTotalCount(res.totalCount);
        setHasNext(res.hasNext);
        setHasPrev(res.hasPrevious);
      })
      .catch(() => setError("تعذّر تحميل المشاريع. يرجى المحاولة مجدداً."))
      .finally(() => setLoading(false));
  }, [cityParam, statusParam, pageParam]);

  // ── URL helpers ─────────────────────────────────────────────────────────────

  function buildParams(f: FilterForm, page: number): URLSearchParams {
    const p = new URLSearchParams();
    if (f.city)   p.set("city",   f.city);
    if (f.status) p.set("status", f.status);
    if (page > 1) p.set("page",   String(page));
    return p;
  }

  function handleApply(e: FormEvent) {
    e.preventDefault();
    const qs = buildParams(form, 1).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleClear() {
    setForm(EMPTY_FILTERS);
    router.push(pathname);
  }

  function goToPage(p: number) {
    const current: FilterForm = { city: cityParam, status: statusParam };
    const qs = buildParams(current, p).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasActiveFilters = !!(cityParam || statusParam);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>

        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-header__title">المشاريع العقارية</h1>
          {!loading && !error && (
            <p className="page-header__subtitle">
              {totalCount > 0
                ? `${totalCount.toLocaleString("en")} مشروع`
                : hasActiveFilters ? "لا توجد نتائج" : "لا توجد مشاريع حالياً"}
            </p>
          )}
        </div>

        {/* Filter Bar */}
        <form className="filter-bar" onSubmit={handleApply}>
          <div className="filter-bar__grid">

            {/* City */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="f-city">المدينة</label>
              <select
                id="f-city"
                className="form-input"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              >
                <option value="">الكل</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="f-status">حالة المشروع</label>
              <select
                id="f-status"
                className="form-input"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="">الكل</option>
                {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

          </div>

          <div className="filter-bar__actions">
            {hasActiveFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
                مسح الفلاتر
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm">
              تطبيق
            </button>
          </div>
        </form>

        {/* Loading */}
        {loading && <Spinner />}

        {/* Error */}
        {!loading && error && (
          <div className="error-banner">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && projects.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">🏗️</div>
            <h2 className="empty-state__title">
              {hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد مشاريع متاحة"}
            </h2>
            <p className="empty-state__desc">
              {hasActiveFilters
                ? "جرّب تغيير معايير البحث أو مسح الفلاتر."
                : "لم يتم إضافة أي مشاريع حتى الآن."}
            </p>
            {hasActiveFilters && (
              <button
                className="btn btn-outline"
                style={{ marginTop: "1rem" }}
                onClick={handleClear}
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        )}

        {/* Results grid */}
        {!loading && !error && projects.length > 0 && (
          <>
            <div className="grid-cards">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>

            {(hasPrev || hasNext) && (
              <div className="pagination">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!hasPrev}
                  onClick={() => goToPage(pageParam - 1)}
                >
                  ← السابق
                </button>
                <span className="pagination__info">صفحة {pageParam}</span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!hasNext}
                  onClick={() => goToPage(pageParam + 1)}
                >
                  التالي →
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ─── Page wrapper — required for useSearchParams ──────────────────────────────

export default function ProjectsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProjectsContent />
    </Suspense>
  );
}
