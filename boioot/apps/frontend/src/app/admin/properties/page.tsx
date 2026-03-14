"use client";

import { useEffect, useState, useCallback } from "react";
import { adminService } from "@/services/admin.service";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, PropertyResponse } from "@/types";

const LISTING_LABEL: Record<string, string> = { Sale: "للبيع", Rent: "للإيجار", Investment: "للاستثمار" };
const STATUS_BADGE: Record<string, string> = {
  Available: "badge-green", Sold: "badge-red", Rented: "badge-blue", Reserved: "badge-yellow",
};

export default function AdminPropertiesPage() {
  const [result, setResult] = useState<PagedResult<PropertyResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getProperties({ page, pageSize: 15 });
      setResult(data);
    } catch {
      setError("تعذّر تحميل بيانات العقارات.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">العقارات</h1>
        <p className="page-header__subtitle">جميع العقارات المسجّلة في المنصة</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <Spinner />
      ) : result && result.items.length === 0 ? (
        <EmptyState icon="🏠" title="لا توجد عقارات" />
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>الشركة</th>
                  <th>المدينة</th>
                  <th>النوع</th>
                  <th>السعر</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {result?.items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.title}</td>
                    <td style={{ fontSize: "0.85rem" }}>{p.companyName}</td>
                    <td>{p.city}</td>
                    <td>
                      <span className="badge badge-blue">
                        {LISTING_LABEL[p.listingType] ?? p.listingType}
                      </span>
                    </td>
                    <td>{p.price.toLocaleString("ar-SY")} ل.س</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] ?? "badge-gray"}`}>
                        {p.status}
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

