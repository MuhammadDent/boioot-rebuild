"use client";

import { useEffect, useState } from "react";
import { dashboardService } from "@/services/dashboard.service";
import Spinner from "@/components/ui/Spinner";
import type { DashboardSummaryResponse } from "@/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardService
      .getSummary()
      .then(setSummary)
      .catch(() => setError("تعذّر تحميل البيانات."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const stats = summary
    ? [
        { label: "إجمالي العقارات", value: summary.totalProperties, icon: "🏠" },
        { label: "إجمالي المشاريع", value: summary.totalProjects, icon: "🏗️" },
        { label: "الطلبات الكلية", value: summary.totalRequests, icon: "📋" },
        { label: "طلبات جديدة", value: summary.newRequests, icon: "🆕" },
        { label: "المحادثات", value: summary.totalConversations, icon: "💬" },
        { label: "رسائل غير مقروءة", value: summary.unreadMessages, icon: "📩" },
      ]
    : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">لوحة التحكم</h1>
        <p className="page-header__subtitle">نظرة عامة على نشاطك</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <p className="stat-card__label">
              {s.icon} {s.label}
            </p>
            <p className="stat-card__value">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

