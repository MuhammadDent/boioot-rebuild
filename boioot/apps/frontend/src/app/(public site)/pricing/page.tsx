"use client";

import { useState, useEffect } from "react";
import type { PublicPricingItem } from "@/features/pricing/types";
import { pricingApi } from "@/features/pricing/api";
import BillingToggle, { type BillingCycle } from "@/components/pricing/BillingToggle";
import PricingCard from "@/components/pricing/PricingCard";
import Spinner from "@/components/ui/Spinner";

// ─── Plan grouping ────────────────────────────────────────────────────────────

const INDIVIDUAL_PLANS  = ["Free", "Silver", "Gold", "Platinum"];
const PROFESSIONAL_PLANS = ["OwnerPro", "AgentPro", "AgentPremium", "OfficeStarter", "BusinessGrowth"];

function filterGroup(plans: PublicPricingItem[], names: string[]) {
  return plans.filter((p) => names.includes(p.planName));
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      gap:            "0.75rem",
      marginBottom:   "1.5rem",
    }}>
      <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
      <span style={{
        fontSize:    "0.82rem",
        fontWeight:  700,
        color:       "var(--color-text-muted)",
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        whiteSpace:  "nowrap",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
    </div>
  );
}

// ─── Plan grid ────────────────────────────────────────────────────────────────

function PlansGrid({ plans, cycle }: { plans: PublicPricingItem[]; cycle: BillingCycle }) {
  if (!plans.length) return null;
  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
      gap:                 "1.5rem",
    }}>
      {plans.map((plan) => (
        <PricingCard key={plan.planId} plan={plan} cycle={cycle} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [plans,   setPlans]   = useState<PublicPricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [cycle,   setCycle]   = useState<BillingCycle>("Monthly");

  useEffect(() => {
    pricingApi.getPublicPricing()
      .then(setPlans)
      .catch((e) => setError(e instanceof Error ? e.message : "حدث خطأ"))
      .finally(() => setLoading(false));
  }, []);

  const individualPlans   = filterGroup(plans, INDIVIDUAL_PLANS);
  const professionalPlans = filterGroup(plans, PROFESSIONAL_PLANS);
  const otherPlans        = plans.filter(
    (p) => !INDIVIDUAL_PLANS.includes(p.planName) && !PROFESSIONAL_PLANS.includes(p.planName)
  );

  // Compute average yearly saving for BillingToggle label
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
          plans.filter((p) => {
            const m = p.pricing.find((x) => x.billingCycle === "Monthly");
            return m && m.priceAmount > 0;
          }).length || 1
      )
    : 17;

  return (
    <main style={{ background: "var(--color-background)", minHeight: "100vh" }}>

      {/* ── Hero ── */}
      <section style={{
        background:     "linear-gradient(160deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)",
        color:          "#fff",
        textAlign:      "center",
        padding:        "4rem 1.5rem 5rem",
      }}>
        <h1 style={{
          fontSize:   "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: 900,
          margin:     "0 0 0.75rem",
          letterSpacing: "-0.01em",
        }}>
          اختر الباقة المناسبة لك
        </h1>
        <p style={{
          fontSize:   "1.05rem",
          opacity:    0.88,
          maxWidth:   "520px",
          margin:     "0 auto 2rem",
          lineHeight: 1.6,
        }}>
          باقات مرنة تناسب أصحاب العقارات والوكلاء والشركات — وفّر أكثر مع الاشتراك السنوي
        </p>

        {/* BillingToggle */}
        <div style={{
          display:        "flex",
          justifyContent: "center",
          filter:         "drop-shadow(0 2px 8px rgba(0,0,0,0.15))",
        }}>
          <div style={{ background: "#fff", borderRadius: "999px", padding: "0.2rem" }}>
            <BillingToggle cycle={cycle} onChange={setCycle} yearlySavingPct={avgSaving} />
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section style={{
        maxWidth: "var(--max-width)",
        margin:   "0 auto",
        padding:  "2.5rem 1.5rem 4rem",
      }}>

        {loading && <Spinner />}

        {error && (
          <div style={{
            textAlign:  "center",
            padding:    "3rem",
            color:      "var(--color-error)",
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>

            {/* Individual plans */}
            {individualPlans.length > 0 && (
              <div>
                <SectionLabel label="باقات الأفراد" />
                <PlansGrid plans={individualPlans} cycle={cycle} />
              </div>
            )}

            {/* Professional plans */}
            {professionalPlans.length > 0 && (
              <div>
                <SectionLabel label="باقات المحترفين والشركات" />
                <PlansGrid plans={professionalPlans} cycle={cycle} />
              </div>
            )}

            {/* Any other plans */}
            {otherPlans.length > 0 && (
              <div>
                <SectionLabel label="باقات أخرى" />
                <PlansGrid plans={otherPlans} cycle={cycle} />
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── FAQ strip ── */}
      {!loading && !error && (
        <section style={{
          background:  "var(--color-surface)",
          borderTop:   "1px solid var(--color-border)",
          padding:     "2.5rem 1.5rem",
          textAlign:   "center",
        }}>
          <p style={{
            fontSize: "0.9rem",
            color:    "var(--color-text-secondary)",
            maxWidth: "600px",
            margin:   "0 auto",
            lineHeight: 1.7,
          }}>
            جميع الباقات تشمل حماية البيانات وإمكانية الإلغاء في أي وقت.
            للأسئلة والاستفسارات تواصل معنا عبر صفحة{" "}
            <a href="/requests" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              الطلبات
            </a>.
          </p>
        </section>
      )}
    </main>
  );
}
