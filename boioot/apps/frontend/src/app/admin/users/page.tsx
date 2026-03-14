"use client";

import { useEffect, useState, useCallback } from "react";
import { adminService } from "@/services/admin.service";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, AdminUserResponse } from "@/types";

const ROLE_LABEL: Record<string, string> = {
  Admin: "مدير", CompanyOwner: "مالك شركة", Agent: "وكيل", User: "مستخدم",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [result, setResult] = useState<PagedResult<AdminUserResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({ page, pageSize: 15 });
      setResult(data);
    } catch {
      setError("تعذّر تحميل بيانات المستخدمين.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleToggle(userId: string, isActive: boolean) {
    if (userId === currentUser?.id) return;
    setToggling(userId);
    try {
      const updated = await adminService.updateUserStatus(userId, !isActive);
      setResult((prev) =>
        prev
          ? { ...prev, items: prev.items.map((u) => (u.id === userId ? updated : u)) }
          : prev
      );
    } catch {
      setError("تعذّر تغيير حالة المستخدم.");
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">المستخدمون</h1>
        <p className="page-header__subtitle">إدارة حسابات مستخدمي المنصة</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <Spinner />
      ) : result && result.items.length === 0 ? (
        <EmptyState icon="👥" title="لا يوجد مستخدمون" />
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {result?.items.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.fullName}</td>
                    <td dir="ltr" style={{ fontSize: "0.85rem" }}>{u.email}</td>
                    <td>
                      <span className="badge badge-blue">{ROLE_LABEL[u.role] ?? u.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? "badge-green" : "badge-red"}`}>
                        {u.isActive ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    <td>
                      {u.id !== currentUser?.id ? (
                        <button
                          className={`btn btn-sm ${u.isActive ? "btn-danger" : "btn-outline"}`}
                          onClick={() => handleToggle(u.id, u.isActive)}
                          disabled={toggling === u.id}
                        >
                          {u.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>أنت</span>
                      )}
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

