"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { adminSubscriptionApi } from "@/features/admin/subscription-api";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { AdminSubscriptionDto } from "@/features/admin/subscription-api";
import type { SubscriptionHistoryDto } from "@/features/subscription/types";
import type { AdminPlanSummary } from "@/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SY", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatDatetime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-SY", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  Active:   "نشط",
  Trial:    "تجريبي",
  Pending:  "معلق",
  PastDue:  "متأخر",
  Canceled: "ملغى",
  Expired:  "منتهي",
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  Active:   { bg: "#f0fdf4", color: "#166534" },
  Trial:    { bg: "#eff6ff", color: "#1d4ed8" },
  Pending:  { bg: "#fffbeb", color: "#92400e" },
  PastDue:  { bg: "#fff1f2", color: "#9f1239" },
  Canceled: { bg: "#f1f5f9", color: "#475569" },
  Expired:  { bg: "#f1f5f9", color: "#475569" },
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  created:         "إنشاء",
  assigned:        "تعيين",
  changed:         "تغيير",
  upgraded:        "ترقية",
  downgraded:      "تخفيض",
  renewed:         "تجديد",
  canceled:        "إلغاء",
  expired:         "انتهاء",
  trial_started:   "بدء تجربة",
  trial_converted: "تحويل تجربة",
};

const FILTER_TABS = [
  { key: "",         label: "الكل"       },
  { key: "Active",   label: "نشط"        },
  { key: "Trial",    label: "تجريبي"     },
  { key: "Pending",  label: "معلق"       },
  { key: "PastDue",  label: "متأخر"      },
  { key: "Canceled", label: "ملغى"       },
  { key: "Expired",  label: "منتهي"      },
];

// ── AssignPlanModal ───────────────────────────────────────────────────────────

function AssignPlanModal({
  plans,
  onClose,
  onSuccess,
}: {
  plans: AdminPlanSummary[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [accountId, setAccountId] = useState("");
  const [planId, setPlanId]       = useState("");
  const [notes, setNotes]         = useState("");
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit() {
    if (!accountId.trim() || !planId) {
      setError("الرجاء تعبئة معرّف الحساب والباقة.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminSubscriptionApi.assign({
        accountId: accountId.trim(),
        planId,
        pricingId: null,
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (err) {
      setError(normalizeError(err));
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: "#fff", borderRadius: 18,
        width: "100%", maxWidth: 500, padding: "1.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#1a2e1a" }}>
            تعيين باقة لحساب
          </h2>
          <button
            onClick={onClose}
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.3rem" }}
          >
            ✕
          </button>
        </div>

        {/* Account ID */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>
            معرّف الحساب (Account ID)
          </label>
          <input
            type="text"
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            style={{
              width: "100%", padding: "0.65rem 0.85rem",
              borderRadius: 9, border: "1.5px solid #e2e8f0",
              fontSize: "0.88rem", boxSizing: "border-box",
              fontFamily: "monospace",
            }}
          />
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
            يمكن الحصول على معرّف الحساب من قائمة الاشتراكات أدناه أو من صفحة إدارة المستخدمين.
          </p>
        </div>

        {/* Plan picker */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>
            الباقة
          </label>
          <select
            value={planId}
            onChange={e => setPlanId(e.target.value)}
            style={{
              width: "100%", padding: "0.65rem 0.85rem",
              borderRadius: 9, border: "1.5px solid #e2e8f0",
              fontSize: "0.88rem", boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            <option value="">— اختر الباقة —</option>
            {plans.filter(p => p.isActive).map(p => (
              <option key={p.id} value={p.id}>
                {p.displayNameAr ?? p.name}
                {p.audienceType ? ` (${p.audienceType})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>
            ملاحظة (اختياري)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="سبب التعيين أو ملاحظة إدارية..."
            style={{
              width: "100%", padding: "0.65rem 0.85rem",
              borderRadius: 9, border: "1.5px solid #e2e8f0",
              fontSize: "0.88rem", resize: "vertical",
              boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
        </div>

        {error && (
          <div style={{
            backgroundColor: "#fee2e2", border: "1px solid #fca5a5",
            borderRadius: 9, padding: "0.75rem", marginBottom: "1rem",
            fontSize: "0.85rem", color: "#b91c1c",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            onClick={onClose}
            type="button"
            disabled={busy}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: 10,
              border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc",
              color: "#475569", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            disabled={busy}
            style={{
              flex: 2, padding: "0.75rem", borderRadius: 10,
              border: "none",
              backgroundColor: busy ? "#94a3b8" : "#059669",
              color: "#fff", fontSize: "0.9rem", fontWeight: 700,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "جارٍ التعيين..." : "تعيين الباقة"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HistoryDrawer ─────────────────────────────────────────────────────────────

function HistoryDrawer({
  accountId,
  accountName,
  onClose,
}: {
  accountId: string;
  accountName: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<SubscriptionHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminSubscriptionApi.getHistoryByAccount(accountId)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [accountId]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 900,
        backgroundColor: "rgba(0,0,0,0.35)",
        display: "flex", justifyContent: "flex-start",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 420,
        height: "100%", backgroundColor: "#fff",
        overflowY: "auto", padding: "1.5rem",
        boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1a2e1a" }}>
              سجل الاشتراكات
            </h2>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              {accountName}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.3rem" }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", textAlign: "center" }}>جارٍ التحميل...</p>
        ) : history.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", textAlign: "center" }}>لا يوجد سجل لهذا الحساب.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {history.map((item, idx) => (
              <div
                key={item.id}
                style={{ display: "flex", gap: "0.85rem", paddingBottom: idx < history.length - 1 ? "1rem" : 0 }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: "#059669", marginTop: 5, flexShrink: 0,
                  }} />
                  {idx < history.length - 1 && (
                    <div style={{ width: 2, flex: 1, backgroundColor: "#e2e8f0", marginTop: 4 }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: idx < history.length - 1 ? "0.5rem" : 0 }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                    {EVENT_TYPE_LABEL[item.eventType] ?? item.eventType}
                  </p>
                  {(item.oldPlanName || item.newPlanName) && (
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                      {item.oldPlanName && `${item.oldPlanName} ← `}{item.newPlanName ?? "—"}
                    </p>
                  )}
                  {item.notes && (
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                      {item.notes}
                    </p>
                  )}
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.73rem", color: "#94a3b8" }}>
                    {formatDatetime(item.createdAtUtc)}
                    {item.createdByName && ` · ${item.createdByName}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminSubscriptionsPage() {
  useProtectedRoute({ requiredPermission: "billing.manage" });

  const [subs, setSubs]         = useState<AdminSubscriptionDto[]>([]);
  const [plans, setPlans]       = useState<AdminPlanSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAssign, setShowAssign]     = useState(false);
  const [historyFor, setHistoryFor]     = useState<AdminSubscriptionDto | null>(null);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, plansRes] = await Promise.all([
        adminSubscriptionApi.getAll({ status: statusFilter || undefined }),
        adminApi.getPlans().catch(() => [] as AdminPlanSummary[]),
      ]);
      setSubs(subsRes);
      setPlans(plansRes);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleAssignSuccess() {
    setShowAssign(false);
    setSuccessMsg("تم تعيين الباقة بنجاح.");
    await load();
  }

  const counts: Record<string, number> = {};
  subs.forEach(s => {
    counts[s.status] = (counts[s.status] ?? 0) + 1;
  });

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 1100, direction: "rtl" }}>
      <DashboardBackLink href="/dashboard/admin" label="العودة للوحة الإدارة" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", margin: "1rem 0 1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#1a2e1a" }}>
            إدارة الاشتراكات
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            عرض وتعيين وإدارة اشتراكات الحسابات
          </p>
        </div>
        <button
          onClick={() => setShowAssign(true)}
          type="button"
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: 10,
            border: "none",
            backgroundColor: "#059669",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + تعيين باقة
        </button>
      </div>

      {successMsg && (
        <div style={{
          backgroundColor: "#f0fdf4", border: "1px solid #86efac",
          borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1.25rem",
          fontSize: "0.875rem", color: "#166534", fontWeight: 600,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>✅ {successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#166534" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "0.85rem",
        marginBottom: "1.5rem",
      }}>
        {[
          { key: "Active",   label: "نشط",      color: "#166534", bg: "#f0fdf4" },
          { key: "Trial",    label: "تجريبي",   color: "#1d4ed8", bg: "#eff6ff" },
          { key: "Pending",  label: "معلق",     color: "#92400e", bg: "#fffbeb" },
          { key: "PastDue",  label: "متأخر",    color: "#9f1239", bg: "#fff1f2" },
          { key: "Canceled", label: "ملغى",     color: "#475569", bg: "#f1f5f9" },
          { key: "Expired",  label: "منتهي",    color: "#475569", bg: "#f1f5f9" },
        ].map(c => (
          <div key={c.key} style={{
            backgroundColor: c.bg, borderRadius: 12,
            padding: "1rem 1.25rem",
            borderRight: `4px solid ${c.color}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: c.color, lineHeight: 1 }}>
              {counts[c.key] ?? 0}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#555", marginTop: "0.25rem" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            type="button"
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 20,
              border: "none",
              backgroundColor: statusFilter === tab.key ? "#1a2e1a" : "#f1f5f9",
              color: statusFilter === tab.key ? "#fff" : "#475569",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: "#fee2e2", border: "1px solid #fca5a5",
          borderRadius: 10, padding: "1rem", marginBottom: "1.25rem",
          fontSize: "0.875rem", color: "#b91c1c",
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
          جارٍ التحميل...
        </div>
      ) : subs.length === 0 ? (
        <div style={{
          backgroundColor: "#fff", borderRadius: 12,
          padding: "3rem", textAlign: "center",
          border: "1.5px solid #e2e8f0",
          color: "#94a3b8", fontSize: "0.9rem",
        }}>
          لا توجد اشتراكات {statusFilter && `بحالة "${STATUS_LABEL[statusFilter] ?? statusFilter}"`}
        </div>
      ) : (
        <div style={{
          backgroundColor: "#fff", borderRadius: 14,
          border: "1.5px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                  {["الحساب", "البريد", "الباقة", "الحالة", "تاريخ البدء", "نهاية الفترة", "إجراءات"].map(h => (
                    <th key={h} style={{
                      padding: "0.85rem 1rem", textAlign: "right",
                      fontWeight: 700, color: "#374151", whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((sub, idx) => {
                  const sc = STATUS_COLOR[sub.status] ?? { bg: "#f1f5f9", color: "#475569" };
                  return (
                    <tr
                      key={sub.subscriptionId}
                      style={{
                        borderBottom: idx < subs.length - 1 ? "1px solid #f1f5f9" : "none",
                        backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa",
                      }}
                    >
                      {/* Account */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{sub.accountName}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontFamily: "monospace", marginTop: 2 }}>
                          {sub.accountId.slice(0, 8)}…
                        </div>
                      </td>
                      {/* Email */}
                      <td style={{ padding: "0.85rem 1rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {sub.accountOwnerEmail}
                      </td>
                      {/* Plan */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{sub.planName}</div>
                        {sub.billingCycle && sub.priceAmount > 0 && (
                          <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: 2 }}>
                            {sub.priceAmount.toLocaleString("ar-SY")} {sub.currencyCode}
                            {" / "}{sub.billingCycle === "Monthly" ? "شهري" : sub.billingCycle === "Yearly" ? "سنوي" : sub.billingCycle}
                          </div>
                        )}
                      </td>
                      {/* Status */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.25rem 0.7rem",
                          borderRadius: 20,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          backgroundColor: sc.bg,
                          color: sc.color,
                        }}>
                          {STATUS_LABEL[sub.status] ?? sub.status}
                        </span>
                      </td>
                      {/* Start date */}
                      <td style={{ padding: "0.85rem 1rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatDate(sub.startDate)}
                      </td>
                      {/* Period end */}
                      <td style={{ padding: "0.85rem 1rem", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatDate(sub.currentPeriodEnd ?? sub.endDate)}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <button
                          onClick={() => setHistoryFor(sub)}
                          type="button"
                          style={{
                            padding: "0.35rem 0.75rem",
                            borderRadius: 8,
                            border: "1.5px solid #e2e8f0",
                            backgroundColor: "#fff",
                            color: "#475569",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          السجل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAssign && (
        <AssignPlanModal
          plans={plans}
          onClose={() => setShowAssign(false)}
          onSuccess={handleAssignSuccess}
        />
      )}

      {historyFor && (
        <HistoryDrawer
          accountId={historyFor.accountId}
          accountName={historyFor.accountName}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}
