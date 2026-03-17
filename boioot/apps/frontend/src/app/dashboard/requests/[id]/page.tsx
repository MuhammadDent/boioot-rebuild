"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { dashboardRequestsApi } from "@/features/dashboard/requests/api";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_BADGE,
  REQUEST_STATUS_OPTIONS,
} from "@/features/dashboard/requests/constants";
import { normalizeError } from "@/lib/api";
import type { RequestResponse } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestDetailPage() {
  const { user, isLoading: authLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner", "Agent"],
  });

  const params = useParams<{ id: string }>();
  const id = params.id;

  const [request, setRequest]       = useState<RequestResponse | null>(null);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState("");
  const [updating, setUpdating]             = useState(false);
  const [updateError, setUpdateError]       = useState("");
  const [updateSuccess, setUpdateSuccess]   = useState(false);

  // Cleanup success banner timer on unmount to avoid setState on unmounted component
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Load on mount (waits for auth to resolve)
  useEffect(() => {
    if (authLoading || !user || !id) return;

    setFetching(true);
    setFetchError("");

    dashboardRequestsApi
      .getById(id)
      .then((res) => {
        setRequest(res);
        setSelectedStatus(res.status);
      })
      .catch((e) => setFetchError(normalizeError(e)))
      .finally(() => setFetching(false));
  }, [authLoading, user, id]);

  async function handleStatusUpdate(e: FormEvent) {
    e.preventDefault();
    if (!request || selectedStatus === request.status) return;

    setUpdating(true);
    setUpdateError("");
    setUpdateSuccess(false);

    try {
      const updated = await dashboardRequestsApi.updateStatus(id, selectedStatus);
      setRequest(updated);
      setSelectedStatus(updated.status);
      setUpdateSuccess(true);

      if (successTimerRef.current !== null) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (e) {
      setUpdateError(normalizeError(e));
    } finally {
      setUpdating(false);
    }
  }

  if (authLoading || !user) return null;

  // ── Loading ──
  if (fetching) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <DashboardBackLink href="/dashboard/requests" label="← الطلبات والاستفسارات" marginBottom="1rem" />
          <LoadingRow />
        </div>
      </div>
    );
  }

  // ── Fetch error ──
  if (fetchError) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <DashboardBackLink href="/dashboard/requests" label="← الطلبات والاستفسارات" marginBottom="1rem" />
          <InlineBanner message={fetchError} />
        </div>
      </div>
    );
  }

  if (!request) return null;

  const statusChanged = selectedStatus !== request.status;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <DashboardBackLink href="/dashboard/requests" label="← الطلبات والاستفسارات" marginBottom="1rem" />

        {/* ── Page title ── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.35rem", color: "var(--color-text-primary)" }}>
            تفاصيل الطلب
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className={REQUEST_STATUS_BADGE[request.status] ?? "badge badge-gray"}>
              {REQUEST_STATUS_LABELS[request.status] ?? request.status}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              {new Date(request.createdAt).toLocaleDateString("en-GB", {
                year: "numeric", month: "numeric", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* ── Contact info ── */}
        <div className="form-card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
            معلومات المتواصل
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            <DetailRow label="الاسم"             value={request.name} />
            <DetailRow label="رقم الهاتف"        value={request.phone} ltr />
            {request.email && (
              <DetailRow label="البريد الإلكتروني" value={request.email} ltr />
            )}
          </div>
        </div>

        {/* ── Request subject ── */}
        {(request.propertyTitle || request.projectTitle) && (
          <div className="form-card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
              موضوع الاستفسار
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {request.propertyTitle && (
                <DetailRow label="العقار" value={request.propertyTitle} />
              )}
              {request.projectTitle && (
                <DetailRow label="المشروع" value={request.projectTitle} />
              )}
              {request.companyName && (
                <DetailRow label="الشركة" value={request.companyName} />
              )}
            </div>
          </div>
        )}

        {/* ── Message ── */}
        {request.message && (
          <div className="form-card" style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.75rem", color: "var(--color-text-primary)" }}>
              الرسالة
            </h2>
            <p style={{
              margin: 0, fontSize: "0.92rem", lineHeight: 1.7,
              color: "var(--color-text-primary)", whiteSpace: "pre-wrap",
            }}>
              {request.message}
            </p>
          </div>
        )}

        {/* ── Status update ── */}
        <div className="form-card">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
            تحديث الحالة
          </h2>

          <form onSubmit={handleStatusUpdate}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-status">
                الحالة الحالية
              </label>
              <select
                id="req-status"
                className="form-input"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setUpdateError("");
                  setUpdateSuccess(false);
                }}
                disabled={updating}
              >
                {REQUEST_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {REQUEST_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <InlineBanner message={updateError} />

            {updateSuccess && (
              <p style={{
                color: "var(--color-primary)", fontSize: "0.85rem",
                margin: "0 0 0.75rem", fontWeight: 600,
              }}>
                ✓ تم تحديث الحالة بنجاح
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: "0.55rem 1.5rem" }}
              disabled={updating || !statusChanged}
            >
              {updating ? "جارٍ الحفظ..." : "حفظ الحالة"}
            </button>
          </form>

          {/* Last updated */}
          <p style={{
            margin: "1rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)",
          }}>
            آخر تحديث:{" "}
            {new Date(request.updatedAt).toLocaleDateString("en-GB", {
              year: "numeric", month: "numeric", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>

      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0.6rem 0", borderBottom: "1px solid var(--color-border)",
    }}>
      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        color: "var(--color-text-primary)", fontWeight: 500, fontSize: "0.92rem",
        direction: ltr ? "ltr" : undefined,
      }}>
        {value}
      </span>
    </div>
  );
}
