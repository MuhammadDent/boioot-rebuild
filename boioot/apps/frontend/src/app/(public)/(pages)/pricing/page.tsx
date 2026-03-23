"use client";

import { useState, useEffect, useCallback } from "react";
import type { PublicPricingItem } from "@/features/pricing/types";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";
import type { UpgradeIntentResponse } from "@/features/subscription/types";
import { pricingApi } from "@/features/pricing/api";
import { subscriptionApi } from "@/features/subscription/api";
import { normalizeError } from "@/lib/api";
import BillingToggle, { type BillingCycle } from "@/components/pricing/BillingToggle";
import PricingCard from "@/components/pricing/PricingCard";
import UpgradeModal from "@/components/pricing/UpgradeModal";
import Spinner from "@/components/ui/Spinner";

// ── Plan grouping (data-driven by planCategory field) ─────────────────────────

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

  // Current subscription (null = unauthenticated or no account)
  const [currentSub,    setCurrentSub]    = useState<CurrentSubscriptionResponse | null>(null);

  // Upgrade-intent modal state
  const [intent,          setIntent]          = useState<UpgradeIntentResponse | null>(null);
  const [modalPricingId,  setModalPricingId]  = useState<string>("");
  const [intentLoading,   setIntentLoading]   = useState(false);

  // ── Fetch public plans ──────────────────────────────────────────────────────

  useEffect(() => {
    pricingApi.getPublicPricing()
      .then(setPlans)
      .catch((e) => setPlansError(normalizeError(e)))
      .finally(() => setPlansLoading(false));
  }, []);

  // ── Fetch current subscription (best-effort — silently ignore 401) ──────────

  useEffect(() => {
    subscriptionApi.getCurrent()
      .then(setCurrentSub)
      .catch(() => {
        // 401 = not logged in, 204 = no account → both map to null
        setCurrentSub(null);
      });
  }, []);

  // ── Handle upgrade-intent click ─────────────────────────────────────────────

  const handleUpgradeIntent = useCallback(async (pricingId: string) => {
    setIntentLoading(true);
    try {
      const result = await subscriptionApi.getUpgradeIntent(pricingId);
      setModalPricingId(pricingId);
      setIntent(result);
    } catch {
      // Silently ignore; the button just resets
    } finally {
      setIntentLoading(false);
    }
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  // Plans are pre-sorted by DisplayOrder from the backend.
  // Group by planCategory; plans with no category appear in "other".

  const individualPlans   = filterByCategory(plans, "Individual");
  const professionalPlans = filterByCategory(plans, "Business");
  const developerPlans    = filterByCategory(plans, "Developer");
  const otherPlans        = plans.filter(
    (p) => !["Individual", "Business", "Developer"].includes(p.planCategory ?? "")
  );

  const avgSaving = plans.length
    ? Math.round(
        plans
          .map((p) => {
            const m = p.pricing.find((x) => x.billingCycle === "Monthly");
            const y = p.pricing.find((x) => x.billingCycle === "Yearly");
            if (!m || !y || m.priceAmount === 0) return 0;
            return Math.round((1 - y.priceAmount / 12 / m.priceAmount) * 100);
          })
          .filter(Boolean)
          .reduce((a, b) => a + b, 0) /
          (plans.filter((p) => {
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

        {/* Logged-in plan indicator */}
        {currentSub && (
          <p style={{
            fontSize:   "0.88rem",
            opacity:    0.9,
            marginBottom: "1rem",
            marginTop:  "-0.5rem",
          }}>
            باقتك الحالية: <strong>{currentSub.planName}</strong>
            {" — "}
            {currentSub.billingCycle === "Yearly" ? "سنوي" : "شهري"}
          </p>
        )}

        {/* BillingToggle */}
        <div style={{ display: "flex", justifyContent: "center", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }}>
          <div style={{ background: "#fff", borderRadius: "999px", padding: "0.2rem" }}>
            <BillingToggle cycle={cycle} onChange={setCycle} yearlySavingPct={avgSaving} />
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section style={{ maxWidth: "var(--max-width)", margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

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
