"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/features/auth/api";
import { normalizeError } from "@/lib/api";
import type { SessionResponse } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-SY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "جهاز غير معروف";

  const lower = ua.toLowerCase();

  let browser = "متصفح غير معروف";
  if (lower.includes("edg/"))           browser = "Edge";
  else if (lower.includes("opr/"))      browser = "Opera";
  else if (lower.includes("chrome"))    browser = "Chrome";
  else if (lower.includes("firefox"))   browser = "Firefox";
  else if (lower.includes("safari"))    browser = "Safari";
  else if (lower.includes("curl"))      browser = "cURL";

  let os = "نظام غير معروف";
  if (lower.includes("windows"))        os = "Windows";
  else if (lower.includes("mac os"))    os = "macOS";
  else if (lower.includes("linux"))     os = "Linux";
  else if (lower.includes("android"))   os = "Android";
  else if (lower.includes("iphone"))    os = "iPhone";
  else if (lower.includes("ipad"))      os = "iPad";

  return `${browser} — ${os}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ isActive, isCurrent }: { isActive: boolean; isCurrent: boolean }) {
  if (isCurrent) {
    return (
      <span style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        background: "#dcfce7",
        color: "#166534",
        fontWeight: 600,
        border: "1px solid #86efac",
      }}>
        الجلسة الحالية
      </span>
    );
  }
  if (isActive) {
    return (
      <span style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        background: "#dbeafe",
        color: "#1e40af",
        fontWeight: 600,
        border: "1px solid #93c5fd",
      }}>
        نشطة
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 12,
      fontSize: 12,
      background: "#f3f4f6",
      color: "#6b7280",
      fontWeight: 600,
      border: "1px solid #d1d5db",
    }}>
      منتهية
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const router  = useRouter();
  const { logout } = useAuth();

  const [sessions, setSessions]     = useState<SessionResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [revoking, setRevoking]     = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.getSessions();
      setSessions(data);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleRevoke = async (session: SessionResponse) => {
    if (session.isCurrent) return;
    setRevoking(session.id);
    try {
      await authApi.revokeSession(session.id);
      flash("تم إلغاء الجلسة بنجاح");
      await load();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevoking("others");
    try {
      await authApi.revokeOtherSessions();
      flash("تم تسجيل الخروج من جميع الأجهزة الأخرى");
      await load();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setRevoking(null);
    }
  };

  const handleLogoutAll = async () => {
    setRevoking("all");
    try {
      await authApi.logoutAll();
      logout();
      router.replace("/login");
    } catch (err) {
      setError(normalizeError(err));
      setRevoking(null);
    }
  };

  const activeSessions  = sessions.filter((s) => s.isActive);
  const inactiveSessions = sessions.filter((s) => !s.isActive);
  const hasOtherActive  = activeSessions.some((s) => !s.isCurrent);

  return (
    <div dir="rtl" style={{ fontFamily: "inherit", maxWidth: 860, margin: "0 auto", padding: "32px 16px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>
          إدارة الجلسات النشطة
        </h1>
        <p style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
          هنا تجد جميع الجلسات المرتبطة بحسابك. يمكنك إنهاء أي جلسة لا تعرفها أو لم تعد بحاجة إليها.
        </p>
      </div>

      {/* ── Success banner ── */}
      {successMsg && (
        <div style={{
          background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7",
          borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 14
        }}>
          {successMsg}
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5",
          borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontSize: 14,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Bulk actions ── */}
      {!loading && (
        <div style={{
          display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap"
        }}>
          {hasOtherActive && (
            <button
              onClick={handleRevokeOthers}
              disabled={revoking !== null}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "1px solid #d97706",
                background: revoking === "others" ? "#fef3c7" : "#fffbeb",
                color: "#92400e",
                cursor: revoking !== null ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {revoking === "others" ? "جارٍ التسجيل..." : "تسجيل الخروج من الأجهزة الأخرى"}
            </button>
          )}
          <button
            onClick={handleLogoutAll}
            disabled={revoking !== null}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid #dc2626",
              background: revoking === "all" ? "#fee2e2" : "#fff",
              color: "#dc2626",
              cursor: revoking !== null ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {revoking === "all" ? "جارٍ التسجيل..." : "تسجيل الخروج من جميع الأجهزة"}
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
          جارٍ تحميل الجلسات...
        </div>
      )}

      {/* ── Active sessions ── */}
      {!loading && activeSessions.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
            الجلسات النشطة ({activeSessions.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                revoking={revoking}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Inactive / historical sessions ── */}
      {!loading && inactiveSessions.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
            جلسات منتهية ({inactiveSessions.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inactiveSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                revoking={revoking}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {!loading && sessions.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
          لا توجد جلسات مسجّلة.
        </div>
      )}
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  revoking,
  onRevoke,
}: {
  session: SessionResponse;
  revoking: string | null;
  onRevoke: (s: SessionResponse) => void;
}) {
  const isThisRevoking = revoking === session.id;
  const canRevoke      = session.isActive && !session.isCurrent;

  return (
    <div style={{
      background: "#fff",
      border: session.isCurrent ? "2px solid #86efac" : "1px solid #e5e7eb",
      borderRadius: 10,
      padding: "16px 20px",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
    }}>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <StatusBadge isActive={session.isActive} isCurrent={session.isCurrent} />
        </div>

        <div style={{ fontSize: 14, color: "#374151", fontWeight: 600, marginBottom: 4 }}>
          {parseUserAgent(session.userAgent)}
        </div>

        <div style={{ fontSize: 12, color: "#6b7280", display: "flex", flexDirection: "column", gap: 2 }}>
          <span>تسجيل الدخول: {formatDate(session.createdAtUtc)}</span>
          {session.isActive ? (
            <span>تنتهي: {formatDate(session.expiresAtUtc)}</span>
          ) : (
            <span>
              انتهت:{" "}
              {session.revokedAtUtc
                ? `تم الإلغاء في ${formatDate(session.revokedAtUtc)}`
                : formatDate(session.expiresAtUtc)}
            </span>
          )}
          {session.createdByIp && (
            <span>عنوان IP: {session.createdByIp}</span>
          )}
        </div>
      </div>

      {/* Action */}
      {canRevoke && (
        <button
          onClick={() => onRevoke(session)}
          disabled={revoking !== null}
          style={{
            flexShrink: 0,
            padding: "7px 16px",
            borderRadius: 7,
            border: "1px solid #fca5a5",
            background: isThisRevoking ? "#fee2e2" : "#fff",
            color: "#dc2626",
            cursor: revoking !== null ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {isThisRevoking ? "جارٍ الإلغاء..." : "إنهاء الجلسة"}
        </button>
      )}
    </div>
  );
}
