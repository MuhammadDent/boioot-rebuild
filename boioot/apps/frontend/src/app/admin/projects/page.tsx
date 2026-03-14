"use client";

import { useEffect, useState, useCallback } from "react";
import { adminService } from "@/services/admin.service";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, ProjectResponse } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  UnderConstruction: "قيد الإنشاء", Completed: "مكتمل",
  Planning: "تخطيط", OnHold: "متوقف",
};
const STATUS_BADGE: Record<string, string> = {
  UnderConstruction: "badge-yellow", Completed: "badge-green",
  Planning: "badge-blue", OnHold: "badge-gray",
};

export default function AdminProjectsPage() {
  const [result, setResult] = useState<PagedResult<ProjectResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getProjects({ page, pageSize: 15 });
      setResult(data);
    } catch {
      setError("تعذّر تحميل بيانات المشاريع.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">المشاريع</h1>
        <p className="page-header__subtitle">جميع المشاريع العقارية في المنصة</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <Spinner />
      ) : result && result.items.length === 0 ? (
        <EmptyState icon="🏗️" title="لا توجد مشاريع" />
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم المشروع</th>
                  <th>الشركة</th>
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
                    <td style={{ fontSize: "0.85rem" }}>{p.companyName}</td>
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

