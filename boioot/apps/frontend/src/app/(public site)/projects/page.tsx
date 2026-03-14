"use client";

import { useEffect, useState, useCallback } from "react";
import { projectsService } from "@/services/projects.service";
import ProjectCard from "@/components/projects/ProjectCard";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, ProjectResponse } from "@/types";

export default function ProjectsPage() {
  const [result, setResult] = useState<PagedResult<ProjectResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [city, setCity] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await projectsService.getPublicList({ page, pageSize: 12, city: city || undefined });
      setResult(data);
    } catch {
      setError("تعذّر تحميل المشاريع. يرجى المحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  }, [page, city]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container">
        <div className="page-header">
          <h1 className="page-header__title">المشاريع العقارية</h1>
          <p className="page-header__subtitle">اكتشف أبرز المشاريع العقارية في سوريا</p>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <input
            className="form-input"
            style={{ maxWidth: 200 }}
            placeholder="المدينة"
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
          />
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <Spinner />
        ) : result && result.items.length === 0 ? (
          <EmptyState icon="🏗️" title="لا توجد مشاريع" description="لم يتم العثور على مشاريع بالفلاتر المختارة" />
        ) : (
          <>
            <div className="grid-cards">
              {result?.items.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
            {result && (
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                totalCount={result.totalCount}
                onPage={(p) => setPage(p)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

