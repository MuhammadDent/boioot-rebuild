import { yearlySaving } from "@/features/pricing/labels";
import type { PublicPricingItem } from "@/features/pricing/types";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";
import type { BillingCycle } from "./BillingToggle";
import FeatureList from "./FeatureList";
import LimitList from "./LimitList";

// ── CTA helpers ───────────────────────────────────────────────────────────────

type CtaKind =
  | "current"
  | "upgrade"
  | "downgrade"
  | "cycle_change"
  | "free_start"
  | "start"
  | "no_auth";

function resolveCta(
  plan: PublicPricingItem,
  cycle: BillingCycle,
  sub: CurrentSubscriptionResponse | null
): { kind: CtaKind; pricingId: string | null } {
  const entry = plan.pricing.find((p) => p.billingCycle === cycle);
  if (!entry) return { kind: "start", pricingId: null };

  const isFree = entry.priceAmount === 0;

  if (!sub) {
    return { kind: isFree ? "free_start" : "no_auth", pricingId: entry.pricingId };
  }

  if (entry.pricingId === sub.pricingId) return { kind: "current",    pricingId: null };
  if (plan.planId === sub.planId)         return { kind: "cycle_change", pricingId: entry.pricingId };
  if (plan.rank > sub.rank)               return { kind: "upgrade",    pricingId: entry.pricingId };
  if (plan.rank < sub.rank)               return { kind: "downgrade",  pricingId: entry.pricingId };
  return { kind: "start", pricingId: entry.pricingId };
}

const CTA_LABEL: Record<CtaKind, string> = {
  current:      "الباقة الحالية ✓",
  upgrade:      "ترقية ↑",
  downgrade:    "تخفيض ↓",
  cycle_change: "تغيير دورة الفوترة",
  free_start:   "ابدأ مجاناً",
  start:        "ابدأ الآن",
  no_auth:      "ابدأ الآن",
};

const CTA_STYLE: Record<CtaKind, { bg: string; color: string; border?: string; cursor?: string }> = {
  current:      { bg: "var(--color-primary-subtle)", color: "var(--color-primary)",      border: "1.5px solid var(--color-primary)", cursor: "default" },
  upgrade:      { bg: "var(--color-primary)",         color: "#fff" },
  downgrade:    { bg: "#fff3e0",                      color: "#e65100",                  border: "1.5px solid #e65100" },
  cycle_change: { bg: "#e3f2fd",                      color: "#1565c0",                  border: "1.5px solid #1565c0" },
  free_start:   { bg: "var(--color-primary)",         color: "#fff" },
  start:        { bg: "transparent",                  color: "var(--color-primary)",     border: "1.5px solid var(--color-primary)" },
  no_auth:      { bg: "transparent",                  color: "var(--color-primary)",     border: "1.5px solid var(--color-primary)" },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface PricingCardProps {
  plan:                PublicPricingItem;
  cycle:               BillingCycle;
  currentSubscription: CurrentSubscriptionResponse | null;
  onUpgradeIntent:     (pricingId: string, planName: string) => void;
  isLoadingIntent:     boolean;
}

export default function PricingCard({
  plan,
  cycle,
  currentSubscription,
  onUpgradeIntent,
  isLoadingIntent,
}: PricingCardProps) {
  const isPopular  = plan.isRecommended;
  const { kind, pricingId } = resolveCta(plan, cycle, currentSubscription);
  const isCurrent  = kind === "current";

  const entry = plan.pricing.find((p) => p.billingCycle === cycle)
    ?? plan.pricing.find((p) => p.billingCycle === "Monthly")
    ?? plan.pricing[0];

  const monthlyEntry = plan.pricing.find((p) => p.billingCycle === "Monthly");
  const yearlyEntry  = plan.pricing.find((p) => p.billingCycle === "Yearly");

  const saving = monthlyEntry && yearlyEntry
    ? yearlySaving(monthlyEntry.priceAmount, yearlyEntry.priceAmount)
    : 0;

  const isFree = entry?.priceAmount === 0;

  const ctaStyle = CTA_STYLE[kind];

  function handleClick() {
    if (isCurrent || isLoadingIntent || !pricingId) return;
    onUpgradeIntent(pricingId, plan.planName);
  }

  return (
    <div style={{
      position:      "relative",
      background:    isCurrent ? "var(--color-primary-subtle)" : "var(--color-surface)",
      border:        isPopular
        ? "2px solid var(--color-primary)"
        : isCurrent
          ? "2px solid var(--color-primary)"
          : "1px solid var(--color-border)",
      borderRadius:  "var(--radius-lg)",
      padding:       "2rem 1.6rem",
      display:       "flex",
      flexDirection: "column",
      gap:           "1.25rem",
      boxShadow:     isPopular || isCurrent ? "0 8px 32px rgba(46,125,50,0.13)" : "var(--shadow-md)",
      transition:    "transform 0.2s, box-shadow 0.2s",
    }}>

      {/* Popular badge */}
      {isPopular && !isCurrent && (
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

      {/* Current plan badge */}
      {isCurrent && (
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
          ✓ باقتك الحالية
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
            fontSize:   "0.85rem",
            color:      "var(--color-text-secondary)",
            margin:     "0.4rem 0 0",
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
                {entry?.priceAmount.toLocaleString("ar-SY")}
              </span>
              <span style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                {entry?.currencyCode}
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
              {cycle === "Monthly" ? "/ شهرياً" : "/ سنوياً"}
              {cycle === "Yearly" && saving > 0 && (
                <span style={{
                  marginRight:  "0.5rem",
                  background:   "#ff7043",
                  color:        "#fff",
                  fontSize:     "0.72rem",
                  fontWeight:   700,
                  padding:      "0.1rem 0.4rem",
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
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
            الحدود
          </p>
          <LimitList limits={plan.limits} />
        </div>
      )}

      {/* Features */}
      {plan.features.length > 0 && (
        <div>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
            الميزات
          </p>
          <FeatureList features={plan.features} />
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
        <button
          onClick={handleClick}
          disabled={isCurrent || isLoadingIntent}
          style={{
            width:        "100%",
            padding:      "0.7rem 1rem",
            borderRadius: "var(--radius-md)",
            border:       ctaStyle.border ?? "none",
            background:   ctaStyle.bg,
            color:        ctaStyle.color,
            cursor:       isCurrent ? "default" : isLoadingIntent ? "wait" : "pointer",
            fontFamily:   "inherit",
            fontSize:     "0.95rem",
            fontWeight:   700,
            transition:   "opacity 0.2s",
            opacity:      isLoadingIntent && !isCurrent ? 0.65 : 1,
          }}
        >
          {isLoadingIntent && !isCurrent ? "جارٍ التحميل..." : CTA_LABEL[kind]}
        </button>
      </div>
    </div>
  );
}
