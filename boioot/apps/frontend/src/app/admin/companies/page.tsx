"use client";

import { useEffect, useState, useCallback } from "react";
import { adminService } from "@/services/admin.service";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, AdminCompanyResponse } from "@/types";

export default function AdminCompaniesPage() {
  const [result, setResult] = useState<PagedResult<AdminCompanyResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getCompanies({ page, pageSize: 15 });
      setResult(data);
    } catch {
      setError("تعذّر تحميل بيانات الشركات.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleVerify(companyId: string, isVerified: boolean) {
    setToggling(companyId);
    try {
      const updated = await adminService.verifyCompany(companyId, !isVerified);
      setResult((prev) =>
        prev
          ? { ...prev, items: prev.items.map((c) => (c.id === companyId ? updated : c)) }
          : prev
      );
    } catch {
      setError("تعذّر تغيير حالة التحقق.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">الشركات</h1>
        <p className="page-header__subtitle">إدارة شركات العقارات المسجّلة</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <Spinner />
      ) : result && result.items.length === 0 ? (
        <EmptyState icon="🏢" title="لا توجد شركات" />
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>اسم الشركة</th>
                  <th>المدينة</th>
                  <th>العقارات</th>
                  <th>المشاريع</th>
                  <th>التحقق</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {result?.items.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.city ?? "—"}</td>
                    <td>{c.propertyCount}</td>
                    <td>{c.projectCount}</td>
                    <td>
                      <span className={`badge ${c.isVerified ? "badge-green" : "badge-yellow"}`}>
                        {c.isVerified ? "موثّقة" : "غير موثّقة"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${c.isVerified ? "btn-ghost" : "btn-primary"}`}
                        onClick={() => handleVerify(c.id, c.isVerified)}
                        disabled={toggling === c.id}
                      >
                        {c.isVerified ? "إلغاء التوثيق" : "توثيق"}
                      </button>
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

