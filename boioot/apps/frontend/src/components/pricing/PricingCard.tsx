import { POPULAR_PLAN_NAME, formatPrice, yearlySaving } from "@/features/pricing/labels";
import type { PublicPricingItem } from "@/features/pricing/types";
import type { BillingCycle } from "./BillingToggle";
import FeatureList from "./FeatureList";
import LimitList from "./LimitList";

interface PricingCardProps {
  plan: PublicPricingItem;
  cycle: BillingCycle;
}

export default function PricingCard({ plan, cycle }: PricingCardProps) {
  const isPopular = plan.planName === POPULAR_PLAN_NAME;

  const currentEntry = plan.pricing.find((p) => p.billingCycle === cycle)
    ?? plan.pricing.find((p) => p.billingCycle === "Monthly")
    ?? plan.pricing[0];

  const monthlyEntry = plan.pricing.find((p) => p.billingCycle === "Monthly");
  const yearlyEntry  = plan.pricing.find((p) => p.billingCycle === "Yearly");

  const saving = monthlyEntry && yearlyEntry
    ? yearlySaving(monthlyEntry.priceAmount, yearlyEntry.priceAmount)
    : 0;

  const isFree = currentEntry?.priceAmount === 0;

  return (
    <div style={{
      position:      "relative",
      background:    "var(--color-surface)",
      border:        isPopular
        ? "2px solid var(--color-primary)"
        : "1px solid var(--color-border)",
      borderRadius:  "var(--radius-lg)",
      padding:       "2rem 1.6rem",
      display:       "flex",
      flexDirection: "column",
      gap:           "1.25rem",
      boxShadow:     isPopular ? "0 8px 32px rgba(46,125,50,0.13)" : "var(--shadow-md)",
      transition:    "transform 0.2s, box-shadow 0.2s",
    }}>

      {/* Popular badge */}
      {isPopular && (
        <div style={{
          position:     "absolute",
          top:          "-1px",
          right:        "1.5rem",
          background:   "var(--color-primary)",
          color:        "#fff",
          fontSize:     "0.75rem",
          fontWeight:   700,
          padding:      "0.25rem 0.85rem",
          borderRadius: "0 0 8px 8px",
          letterSpacing: "0.02em",
        }}>
          ⭐ الأكثر شعبية
        </div>
      )}

      {/* Plan header */}
      <div>
        <h3 style={{
          fontSize:   "1.2rem",
          fontWeight: 800,
          color:      "var(--color-text-primary)",
          margin:     0,
        }}>
          {plan.planName}
        </h3>
        {plan.description && (
          <p style={{
            fontSize: "0.85rem",
            color:    "var(--color-text-secondary)",
            margin:   "0.4rem 0 0",
            lineHeight: 1.5,
          }}>
            {plan.description}
          </p>
        )}
      </div>

      {/* Price */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
        {isFree ? (
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-primary)" }}>
            مجاني
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
                {currentEntry?.priceAmount.toLocaleString("ar-SY")}
              </span>
              <span style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                {currentEntry?.currencyCode}
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
              {cycle === "Monthly" ? "/ شهرياً" : "/ سنوياً"}
              {cycle === "Yearly" && saving > 0 && (
                <span style={{
                  marginRight: "0.5rem",
                  background:  "#ff7043",
                  color:       "#fff",
                  fontSize:    "0.72rem",
                  fontWeight:  700,
                  padding:     "0.1rem 0.4rem",
                  borderRadius: "999px",
                }}>
                  وفر {saving}%
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Limits */}
      {plan.limits.length > 0 && (
        <div>
          <p style={{
            fontSize:   "0.78rem",
            fontWeight: 700,
            color:      "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.6rem",
          }}>
            الحدود
          </p>
          <LimitList limits={plan.limits} />
        </div>
      )}

      {/* Features */}
      {plan.features.length > 0 && (
        <div>
          <p style={{
            fontSize:   "0.78rem",
            fontWeight: 700,
            color:      "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.6rem",
          }}>
            الميزات
          </p>
          <FeatureList features={plan.features} />
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
        <a
          href="/register"
          className={isPopular ? "btn btn-primary" : "btn btn-outline"}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {isFree ? "ابدأ مجاناً" : "ابدأ الآن"}
        </a>
      </div>
    </div>
  );
}
