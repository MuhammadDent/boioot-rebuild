"use client";

import { useState, useEffect, useCallback } from "react";
import type { PublicPricingItem } from "@/features/pricing/types";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";
import type { UpgradeIntentResponse } from "@/features/subscription/types";
import { pricingApi } from "@/features/pricing/api";
import { subscriptionApi } from "@/features/subscription/api";
import { normalizeError } from "@/lib/api";
import {
  getAudienceTypeForUser,
  filterPlansForAudience,
} from "@/features/pricing/planCompatibility";
import BillingToggle, { type BillingCycle } from "@/components/pricing/BillingToggle";
import PricingCard from "@/components/pricing/PricingCard";
import PricingComparisonTable from "@/components/pricing/PricingComparisonTable";
import UpgradeModal from "@/components/pricing/UpgradeModal";
import Spinner from "@/components/ui/Spinner";

// ── Plan grouping ─────────────────────────────────────────────────────────────

function filterByCategory(plans: PublicPricingItem[], category: string) {
  return plans.filter((p) => p.planCategory === category);
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
      <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
    </div>
  );
}

// ── Upgrade trigger banner ────────────────────────────────────────────────────

function UpgradeBanner({
  currentSub,
  onDismiss,
  onScrollToPlans,
}: {
  currentSub: CurrentSubscriptionResponse;
  onDismiss: () => void;
  onScrollToPlans: () => void;
}) {
  const isFreePlan = currentSub.priceAmount === 0;

  if (!isFreePlan) return null;

  return (
    <div style={{
      background:    "linear-gradient(135deg, #fff7ed 0%, #fff3cd 100%)",
      border:        "1.5px solid #f59e0b",
      borderRadius:  "var(--radius-lg)",
      padding:       "1rem 1.25rem",
      marginBottom:  "2rem",
      display:       "flex",
      alignItems:    "center",
      gap:           "1rem",
      flexWrap:      "wrap",
    }}>
      <span style={{ fontSize: "1.5rem" }}>🔒</span>
      <div style={{ flex: 1, minWidth: "200px" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#92400e" }}>
          وصلت للحد — قم بالترقية للاستمرار
        </p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#b45309" }}>
          أنت على الباقة المجانية. قم بالترقية للحصول على المزيد من الإعلانات والميزات.
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          suppressHydrationWarning
          type="button"
          onClick={onScrollToPlans}
          style={{
            padding:      "0.5rem 1.1rem",
            borderRadius: "var(--radius-md)",
            border:       "none",
            background:   "#d97706",
            color:        "#fff",
            fontSize:     "0.88rem",
            fontWeight:   700,
            cursor:       "pointer",
          }}
        >
          ترقية الآن ↑
        </button>
        <button
          suppressHydrationWarning
          type="button"
          onClick={onDismiss}
          style={{
            padding:      "0.5rem 0.75rem",
            borderRadius: "var(--radius-md)",
            border:       "1px solid #f59e0b",
            background:   "transparent",
            color:        "#92400e",
            fontSize:     "0.82rem",
            cursor:       "pointer",
          }}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

// ── Annual saving callout ─────────────────────────────────────────────────────

function AnnualSavingCallout({ saving, cycle, onSwitch }: { saving: number; cycle: BillingCycle; onSwitch: () => void }) {
  if (cycle === "Yearly" || saving <= 0) return null;

  return (
    <div style={{
      background:     "linear-gradient(135deg, #f0fdf4, #dcfce7)",
      border:         "1.5px solid #bbf7d0",
      borderRadius:   "var(--radius-lg)",
      padding:        "0.9rem 1.25rem",
      marginBottom:   "2rem",
      display:        "flex",
      alignItems:     "center",
      gap:            "1rem",
      flexWrap:       "wrap",
    }}>
      <span style={{ fontSize: "1.4rem" }}>💰</span>
      <div style={{ flex: 1, minWidth: "200px" }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: "0.95rem", color: "#166534" }}>
          وفّر {saving}% عند الاشتراك السنوي
        </p>
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", color: "#15803d" }}>
          الأسعار السنوية أرخص — ادفع مرة واحدة وانسَ القلق طوال العام
        </p>
      </div>
      <button
        suppressHydrationWarning
        type="button"
        onClick={onSwitch}
        style={{
          padding:      "0.5rem 1.1rem",
          borderRadius: "var(--radius-md)",
          border:       "none",
          background:   "var(--color-primary)",
          color:        "#fff",
          fontSize:     "0.88rem",
          fontWeight:   700,
          cursor:       "pointer",
          flexShrink:   0,
        }}
      >
        عرض الأسعار السنوية
      </button>
    </div>
  );
}

// ── Plans grid ────────────────────────────────────────────────────────────────

interface GridProps {
  plans:               PublicPricingItem[];
  cycle:               BillingCycle;
  currentSubscription: CurrentSubscriptionResponse | null;
  onUpgradeIntent:     (pricingId: string, planName: string) => void;
  isLoadingIntent:     boolean;
}

function PlansGrid({ plans, cycle, currentSubscription, onUpgradeIntent, isLoadingIntent }: GridProps) {
  if (!plans.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "1.5rem" }}>
      {plans.map((plan) => (
        <PricingCard
          key={plan.planId}
          plan={plan}
          cycle={cycle}
          currentSubscription={currentSubscription}
          onUpgradeIntent={onUpgradeIntent}
          isLoadingIntent={isLoadingIntent}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [plans,         setPlans]         = useState<PublicPricingItem[]>([]);
  const [plansLoading,  setPlansLoading]  = useState(true);
  const [plansError,    setPlansError]    = useState("");
  const [cycle,         setCycle]         = useState<BillingCycle>("Monthly");

  const [currentSub,    setCurrentSub]    = useState<CurrentSubscriptionResponse | null>(null);

  const [intent,          setIntent]          = useState<UpgradeIntentResponse | null>(null);
  const [modalPricingId,  setModalPricingId]  = useState<string>("");
  const [intentLoading,   setIntentLoading]   = useState(false);

  const [bannerDismissed, setBannerDismissed] = useState(false);

  // ── Fetch public plans ──────────────────────────────────────────────────────

  useEffect(() => {
    pricingApi.getPublicPricing()
      .then(setPlans)
      .catch((e) => setPlansError(normalizeError(e)))
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    subscriptionApi.getCurrent()
      .then(setCurrentSub)
      .catch(() => setCurrentSub(null));
  }, []);

  // ── Handle upgrade-intent click ─────────────────────────────────────────────

  const handleUpgradeIntent = useCallback(async (pricingId: string) => {
    setIntentLoading(true);
    try {
      const result = await subscriptionApi.getUpgradeIntent(pricingId);
      setModalPricingId(pricingId);
      setIntent(result);
    } catch {
      // Silently ignore
    } finally {
      setIntentLoading(false);
    }
  }, []);

  function scrollToPlans() {
    document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  // When logged in, show only the plans relevant to this user's audience type.
  // When not logged in (no currentSub), show all plans (marketing page).
  const audienceType = getAudienceTypeForUser(undefined, currentSub?.audienceType);
  const visiblePlans = filterPlansForAudience(plans, audienceType);

  const individualPlans   = filterByCategory(visiblePlans, "Individual");
  const professionalPlans = filterByCategory(visiblePlans, "Business");
  const developerPlans    = filterByCategory(visiblePlans, "Developer");
  const otherPlans        = visiblePlans.filter(
    (p) => !["Individual", "Business", "Developer"].includes(p.planCategory ?? "")
  );

  const avgSaving = visiblePlans.length
    ? Math.round(
        visiblePlans
          .map((p) => {
            const m = p.pricing.find((x) => x.billingCycle === "Monthly");
            const y = p.pricing.find((x) => x.billingCycle === "Yearly");
            if (!m || !y || m.priceAmount === 0) return 0;
            return Math.round((1 - y.priceAmount / 12 / m.priceAmount) * 100);
          })
          .filter(Boolean)
          .reduce((a, b) => a + b, 0) /
          (visiblePlans.filter((p) => {
            const m = p.pricing.find((x) => x.billingCycle === "Monthly");
            return m && m.priceAmount > 0;
          }).length || 1)
      )
    : 17;

  const gridProps: Omit<GridProps, "plans"> = {
    cycle,
    currentSubscription: currentSub,
    onUpgradeIntent:     handleUpgradeIntent,
    isLoadingIntent:     intentLoading,
  };

  const showBanner = !bannerDismissed && currentSub !== null && currentSub.priceAmount === 0;

  return (
    <main style={{ background: "var(--color-background)" }}>

      {/* ── Hero ── */}
      <section style={{
        background:  "linear-gradient(160deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)",
        color:       "#fff",
        textAlign:   "center",
        padding:     "4rem 1.5rem 5rem",
      }}>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, margin: "0 0 0.75rem", letterSpacing: "-0.01em" }}>
          اختر الباقة المناسبة لك
        </h1>
        <p style={{ fontSize: "1.05rem", opacity: 0.88, maxWidth: "520px", margin: "0 auto 2rem", lineHeight: 1.6 }}>
          باقات مرنة تناسب أصحاب العقارات والوكلاء والشركات — وفّر أكثر مع الاشتراك السنوي
        </p>

        {currentSub && (
          <div style={{
            display:       "inline-flex",
            alignItems:    "center",
            gap:           "0.5rem",
            background:    "rgba(255,255,255,0.15)",
            borderRadius:  "999px",
            padding:       "0.35rem 1rem",
            fontSize:      "0.88rem",
            marginBottom:  "1.25rem",
            backdropFilter: "blur(4px)",
          }}>
            <span>👤</span>
            <span>
              باقتك الحالية: <strong>{currentSub.planName}</strong>
              {" — "}
              {currentSub.billingCycle === "OneTime" ? "دفعة واحدة" : currentSub.billingCycle === "Yearly" ? "سنوي" : "شهري"}
            </span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }}>
          <div style={{ background: "#fff", borderRadius: "999px", padding: "0.2rem" }}>
            <BillingToggle cycle={cycle} onChange={setCycle} yearlySavingPct={avgSaving} />
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section
        id="plans-section"
        style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}
      >
        {plansLoading && <Spinner />}

        {plansError && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-error)", fontWeight: 600 }}>
            {plansError}
          </div>
        )}

        {!plansLoading && !plansError && plans.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
            <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</p>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "0.4rem" }}>
              لا توجد خطط متاحة حالياً
            </p>
            <p style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
              سيتم إضافة الخطط قريباً — تواصل معنا للاستفسار
            </p>
          </div>
        )}

        {!plansLoading && !plansError && plans.length > 0 && (
          <>
            {/* ── Task 3: Upgrade trigger banner ── */}
            {showBanner && currentSub && (
              <UpgradeBanner
                currentSub={currentSub}
                onDismiss={() => setBannerDismissed(true)}
                onScrollToPlans={scrollToPlans}
              />
            )}

            {/* ── Task 4: Annual saving callout ── */}
            <AnnualSavingCallout
              saving={avgSaving}
              cycle={cycle}
              onSwitch={() => setCycle("Yearly")}
            />

            {/* ── Plan groups ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3.5rem" }}>

              {individualPlans.length > 0 && (
                <div>
                  <SectionLabel label="باقات الأفراد" />
                  <PlansGrid plans={individualPlans} {...gridProps} />
                </div>
              )}

              {professionalPlans.length > 0 && (
                <div>
                  <SectionLabel label="باقات المكاتب والمحترفين" />
                  <PlansGrid plans={professionalPlans} {...gridProps} />
                </div>
              )}

              {developerPlans.length > 0 && (
                <div>
                  <SectionLabel label="باقات شركات التطوير" />
                  <PlansGrid plans={developerPlans} {...gridProps} />
                </div>
              )}

              {otherPlans.length > 0 && (
                <div>
                  <SectionLabel label="باقات أخرى" />
                  <PlansGrid plans={otherPlans} {...gridProps} />
                </div>
              )}
            </div>

            {/* ── Task 2: Comparison table ── */}
            <PricingComparisonTable
              plans={visiblePlans}
              currentSubscription={currentSub}
            />
          </>
        )}
      </section>

      {/* ── Footer strip ── */}
      {!plansLoading && !plansError && (
        <section style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", padding: "2.5rem 1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", maxWidth: "600px", margin: "0 auto", lineHeight: 1.7 }}>
            جميع الباقات تشمل حماية البيانات وإمكانية الإلغاء في أي وقت.
            للاستفسارات تواصل معنا عبر صفحة{" "}
            <a href="/requests" style={{ color: "var(--color-primary)", fontWeight: 600 }}>الطلبات</a>.
          </p>
        </section>
      )}

      {/* ── Upgrade-intent modal ── */}
      {intent && (
        <UpgradeModal
          intent={intent}
          pricingId={modalPricingId}
          onClose={() => { setIntent(null); setModalPricingId(""); }}
        />
      )}
    </main>
  );
}
