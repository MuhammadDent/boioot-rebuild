"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { dashboardPropertiesApi } from "@/features/dashboard/properties/api";
import PropertyForm from "@/components/dashboard/properties/PropertyForm";
import { api, normalizeError } from "@/lib/api";
import type { CreatePropertyRequest, UpdatePropertyRequest } from "@/types";

const COMPANY_ROLES = ["Admin", "CompanyOwner"];

type TrialStats = { used: number; limit: number; isFreeTrial: boolean };

export default function NewPropertyPage() {
  const { user, isLoading, isUnauthorized } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner"],
  });

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError]   = useState("");
  const [trialStats, setTrialStats]     = useState<TrialStats | null>(null);

  const isUserRole = user?.role === "User";

  useEffect(() => {
    if (!user) return;
    if (!COMPANY_ROLES.includes(user.role)) {
      router.replace("/post-ad");
      return;
    }
    api.get<TrialStats>("/properties/my-listings/stats")
      .then((s) => setTrialStats(s))
      .catch(() => {});
  }, [user, router]);

  async function handleSubmit(data: CreatePropertyRequest | UpdatePropertyRequest) {
    setIsSubmitting(true);
    setServerError("");
    try {
      const payload = data as CreatePropertyRequest;
      if (user && COMPANY_ROLES.includes(user.role)) {
        await dashboardPropertiesApi.create(payload);
      } else {
        await dashboardPropertiesApi.postUserListing(payload);
      }
      router.push("/dashboard/listings?success=1");
    } catch (e) {
      const msg = normalizeError(e);
      setServerError(msg);
      if (isUserRole) {
        api.get<TrialStats>("/properties/my-listings/stats")
          .then((s) => setTrialStats(s))
          .catch(() => {});
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return null;

  if (isUnauthorized || !user) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          textAlign: "center",
          padding: "2rem",
          color: "var(--color-text-secondary)",
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.5 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          ليس لديك صلاحية إضافة إعلانات
        </p>
        <p style={{ margin: 0, fontSize: "0.85rem" }}>
          يجب أن يكون حسابك مُفعّلاً كمالك عقار أو وسيط أو مالك شركة.
        </p>
      </div>
    );
  }

  const trialLimitReached =
    isUserRole && trialStats !== null && trialStats.used >= trialStats.limit;

  if (trialLimitReached) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--color-bg)",
          padding: "2rem 1rem",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ marginBottom: "1.75rem" }}>
            <DashboardBackLink href="/dashboard/listings" label="← إعلاناتي" />
          </div>

          <div
            style={{
              background: "#fff",
              border: "1.5px solid #fecaca",
              borderRadius: 16,
              padding: "2.5rem 2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🔒</div>
            <h2
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              انتهت إعلاناتك التجريبية المجانية
            </h2>
            <p
              style={{
                margin: "0 0 0.5rem",
                fontSize: "0.92rem",
                color: "#64748b",
                lineHeight: 1.7,
              }}
            >
              لقد استخدمت {trialStats!.used} من {trialStats!.limit} إعلانات تجريبية مجانية.
            </p>
            <p
              style={{
                margin: "0 0 2rem",
                fontSize: "0.92rem",
                color: "#64748b",
                lineHeight: 1.7,
              }}
            >
              للمتابعة ونشر المزيد من الإعلانات، يجب ترقية حسابك إلى <strong>مالك عقار</strong> أو <strong>وسيط عقاري</strong>.
            </p>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/pricing?upgrade=Owner"
                style={{
                  padding: "0.75rem 1.75rem",
                  borderRadius: 10,
                  background: "var(--color-primary)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                }}
              >
                ترقية إلى مالك عقار
              </Link>
              <Link
                href="/pricing?upgrade=Broker"
                style={{
                  padding: "0.75rem 1.75rem",
                  borderRadius: 10,
                  background: "#0f172a",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                }}
              >
                ترقية إلى وسيط عقاري
              </Link>
            </div>

            <p
              style={{
                marginTop: "1.75rem",
                fontSize: "0.78rem",
                color: "#94a3b8",
              }}
            >
              الإعلانات التجريبية المجانية: {trialStats!.used} / {trialStats!.limit} مستخدمة
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard/listings" label="← إعلاناتي" />
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--color-text-primary)",
            }}
          >
            إضافة إعلان جديد
          </h1>
        </div>

        {isUserRole && trialStats !== null && (
          <div
            style={{
              background: trialStats.used === trialStats.limit - 1
                ? "#fffbeb"
                : "#f0f9ff",
              border: `1px solid ${trialStats.used === trialStats.limit - 1 ? "#fde68a" : "#bae6fd"}`,
              borderRadius: 10,
              padding: "0.85rem 1.2rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: trialStats.used === trialStats.limit - 1 ? "#92400e" : "#0369a1",
                }}
              >
                {trialStats.used === trialStats.limit - 1
                  ? "هذا آخر إعلان تجريبي مجاني لك"
                  : "حساب تجريبي مجاني"}
              </p>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                استخدمت {trialStats.used} من {trialStats.limit} إعلانات تجريبية مجانية
              </p>
            </div>
            <div
              style={{
                background: trialStats.used === trialStats.limit - 1 ? "#f59e0b" : "var(--color-primary)",
                color: "#fff",
                borderRadius: 99,
                padding: "0.3rem 0.9rem",
                fontWeight: 700,
                fontSize: "0.88rem",
                whiteSpace: "nowrap",
              }}
            >
              {trialStats.used} / {trialStats.limit}
            </div>
          </div>
        )}

        <div className="form-card">
          <PropertyForm
            mode="create"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            serverError={serverError}
          />
        </div>
      </div>
    </div>
  );
}
