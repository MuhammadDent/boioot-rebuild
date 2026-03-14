"use client";

import { useEffect, useState, useCallback } from "react";
import { dashboardService } from "@/services/dashboard.service";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, DashboardPropertyItem } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  Available: "متاح", Sold: "مباع", Rented: "مؤجر", Reserved: "محجوز",
};
const STATUS_BADGE: Record<string, string> = {
  Available: "badge-green", Sold: "badge-red", Rented: "badge-blue", Reserved: "badge-yellow",
};
const TYPE_LABEL: Record<string, string> = {
  Apartment: "شقة", Villa: "فيلا", Land: "أرض", Office: "مكتب",
  Shop: "محل", Warehouse: "مستودع", Building: "بناء", Other: "أخرى",
};
const LISTING_LABEL: Record<string, string> = {
  Sale: "للبيع", Rent: "للإيجار", Investment: "للاستثمار",
};

export default function DashboardPropertiesPage() {
  const [result, setResult] = useState<PagedResult<DashboardPropertyItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getProperties(page, 10);
      setResult(data);
    } catch {
      setError("تعذّر تحميل العقارات.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">عقاراتي</h1>
        <p className="page-header__subtitle">إدارة العقارات المرتبطة بشركتك</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <Spinner />
      ) : result && result.items.length === 0 ? (
        <EmptyState icon="🏠" title="لا توجد عقارات" description="لم تُضف أي عقارات بعد" />
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>العنوان</th>
                  <th>النوع</th>
                  <th>السعر</th>
                  <th>المدينة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {result?.items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.title}</td>
                    <td>
                      <span className="badge badge-blue">
                        {TYPE_LABEL[p.type] ?? p.type}
                      </span>
                      <span className="badge badge-gray" style={{ marginRight: "0.4rem" }}>
                        {LISTING_LABEL[p.listingType] ?? p.listingType}
                      </span>
                    </td>
                    <td>{p.price.toLocaleString("ar-SY")} ل.س</td>
                    <td>{p.city}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] ?? "badge-gray"}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
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

