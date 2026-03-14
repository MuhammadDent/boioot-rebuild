"use client";

import { useEffect, useState, useCallback } from "react";
import { dashboardService } from "@/services/dashboard.service";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, DashboardProjectItem } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  UnderConstruction: "قيد الإنشاء", Completed: "مكتمل",
  Planning: "تخطيط", OnHold: "متوقف",
};
const STATUS_BADGE: Record<string, string> = {
  UnderConstruction: "badge-yellow", Completed: "badge-green",
  Planning: "badge-blue", OnHold: "badge-gray",
};

export default function DashboardProjectsPage() {
  const [result, setResult] = useState<PagedResult<DashboardProjectItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getProjects(page, 10);
      setResult(data);
    } catch {
      setError("تعذّر تحميل المشاريع.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">مشاريعي</h1>
        <p className="page-header__subtitle">إدارة المشاريع العقارية لشركتك</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <Spinner />
      ) : result && result.items.length === 0 ? (
        <EmptyState icon="🏗️" title="لا توجد مشاريع" description="لم تُضف أي مشاريع بعد" />
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم المشروع</th>
                  <th>المدينة</th>
                  <th>السعر الابتدائي</th>
                  <th>الحالة</th>
                  <th>منشور</th>
                </tr>
              </thead>
              <tbody>
                {result?.items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.title}</td>
                    <td>{p.city}</td>
                    <td>
                      {p.startingPrice != null
                        ? `${p.startingPrice.toLocaleString("ar-SY")} ل.س`
                        : "—"}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] ?? "badge-gray"}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.isPublished ? "badge-green" : "badge-gray"}`}>
                        {p.isPublished ? "نعم" : "لا"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  );
}

