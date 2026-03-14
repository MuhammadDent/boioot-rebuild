"use client";

import { useEffect, useState, useCallback } from "react";
import { dashboardService } from "@/services/dashboard.service";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, DashboardRequestItem } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  New: "جديد", InProgress: "قيد المعالجة", Completed: "مكتمل", Cancelled: "ملغى",
};
const STATUS_BADGE: Record<string, string> = {
  New: "badge-blue", InProgress: "badge-yellow", Completed: "badge-green", Cancelled: "badge-red",
};

export default function DashboardRequestsPage() {
  const [result, setResult] = useState<PagedResult<DashboardRequestItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getRequests(page, 10);
      setResult(data);
    } catch {
      setError("تعذّر تحميل الطلبات.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">الطلبات</h1>
        <p className="page-header__subtitle">الطلبات الواردة على عقاراتك ومشاريعك</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <Spinner />
      ) : result && result.items.length === 0 ? (
        <EmptyState icon="📋" title="لا توجد طلبات" description="لم يصل أي طلب بعد" />
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>العقار / المشروع</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {result?.items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td dir="ltr">{r.phone}</td>
                    <td>{r.propertyTitle ?? r.projectTitle ?? "—"}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[r.status] ?? "badge-gray"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
                      {new Date(r.createdAt).toLocaleDateString("ar-SY")}
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

