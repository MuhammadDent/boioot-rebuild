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

  if (entry.pricingId === sub.pricingId) return { kind: "current",      pricingId: null };
  if (plan.planId === sub.planId)         return { kind: "cycle_change", pricingId: entry.pricingId };
  if (plan.rank > sub.rank)               return { kind: "upgrade",      pricingId: entry.pricingId };
  if (plan.rank < sub.rank)               return { kind: "downgrade",    pricingId: entry.pricingId };
  return { kind: "start", pricingId: entry.pricingId };
}

const CTA_LABEL: Record<CtaKind, string> = {
  current:      "باقتك الحالية ✓",
  upgrade:      "ترقية ↑",
  downgrade:    "تخفيض",
  cycle_change: "تغيير دورة الفوترة",
  free_start:   "ابدأ مجاناً",
  start:        "اشترك الآن",
  no_auth:      "اشترك الآن",
};

const CTA_STYLE: Record<CtaKind, { bg: string; color: string; border?: string; cursor?: string }> = {
  current:      { bg: "var(--color-primary-subtle)", color: "var(--color-primary)", border: "1.5px solid var(--color-primary)", cursor: "default" },
  upgrade:      { bg: "var(--color-primary)",         color: "#fff" },
  downgrade:    { bg: "#fff7ed",                      color: "#c2410c", border: "1.5px solid #fb923c" },
  cycle_change: { bg: "#eff6ff",                      color: "#1d4ed8", border: "1.5px solid #93c5fd" },
  free_start:   { bg: "var(--color-primary)",         color: "#fff" },
  start:        { bg: "transparent",                  color: "var(--color-primary)", border: "1.5px solid var(--color-primary)" },
  no_auth:      { bg: "transparent",                  color: "var(--color-primary)", border: "1.5px solid var(--color-primary)" },
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

  const isFree     = entry?.priceAmount === 0;
  const ctaStyle   = CTA_STYLE[kind];
  const isDisabled = isCurrent || isLoadingIntent;

  function handleClick() {
    if (isDisabled || !pricingId) return;
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
      boxShadow:     isPopular
        ? "0 12px 40px rgba(46,125,50,0.18)"
        : isCurrent
          ? "0 8px 32px rgba(46,125,50,0.13)"
          : "var(--shadow-md)",
      transform:     isPopular ? "scale(1.03)" : "scale(1)",
      transition:    "transform 0.2s, box-shadow 0.2s",
      zIndex:        isPopular ? 1 : 0,
    }}>

      {/* ── Top badge ── */}
      {isPopular && !isCurrent && (
        <div style={{
          position:     "absolute",
          top:          -14,
          right:        "50%",
          transform:    "translateX(50%)",
          background:   "linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))",
          color:        "#fff",
          fontSize:     "0.75rem",
          fontWeight:   800,
          padding:      "0.28rem 1rem",
          borderRadius: 20,
          whiteSpace:   "nowrap",
          letterSpacing: "0.03em",
          boxShadow:    "0 2px 8px rgba(46,125,50,0.35)",
        }}>
          ⭐ الأكثر شيوعاً
        </div>
      )}

      {isCurrent && (
        <div style={{
          position:     "absolute",
          top:          -14,
          right:        "50%",
          transform:    "translateX(50%)",
          background:   "var(--color-primary)",
          color:        "#fff",
          fontSize:     "0.75rem",
          fontWeight:   800,
          padding:      "0.28rem 1rem",
          borderRadius: 20,
          whiteSpace:   "nowrap",
          boxShadow:    "0 2px 8px rgba(46,125,50,0.25)",
        }}>
          ✓ باقتك الحالية
        </div>
      )}

      {/* ── Plan header ── */}
      <div>
        {plan.planCategory && (
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {plan.planCategory}
          </p>
        )}
        <h3 style={{
          fontSize:   "1.25rem",
          fontWeight: 900,
          color:      "var(--color-text-primary)",
          margin:     0,
          lineHeight: 1.2,
        }}>
          {plan.planName}
        </h3>
        {plan.description && (
          <p style={{
            fontSize:   "0.84rem",
            color:      "var(--color-text-secondary)",
            margin:     "0.5rem 0 0",
            lineHeight: 1.6,
          }}>
            {plan.description}
          </p>
        )}
      </div>

      {/* ── Price block ── */}
      <div style={{
        borderTop:    "1px solid var(--color-border)",
        paddingTop:   "1rem",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: "1rem",
      }}>
        {isFree ? (
          <>
            <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--color-primary)", lineHeight: 1 }}>
              مجاني
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: "0.3rem 0 0" }}>
              بدون أي رسوم شهرية
            </p>
          </>
        ) : (
          <>
            {/* Main price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
              <span style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--color-text-primary)", lineHeight: 1 }}>
                {entry?.priceAmount.toLocaleString("ar-SY")}
              </span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                {entry?.currencyCode}
              </span>
            </div>

            {/* Cycle + discount */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                {cycle === "Monthly" ? "/ شهرياً" : "/ سنوياً"}
              </span>

              {/* Yearly: show monthly equivalent */}
              {cycle === "Yearly" && yearlyEntry && (
                <span style={{ fontSize: "0.76rem", color: "var(--color-text-muted)" }}>
                  ({Math.round(yearlyEntry.priceAmount / 12).toLocaleString("ar-SY")} {yearlyEntry.currencyCode} / شهر)
                </span>
              )}

              {/* Monthly: nudge toward yearly if saving exists */}
              {cycle === "Monthly" && saving > 0 && yearlyEntry && (
                <span style={{
                  background:   "#fff7ed",
                  color:        "#c2410c",
                  fontSize:     "0.72rem",
                  fontWeight:   700,
                  padding:      "0.1rem 0.45rem",
                  borderRadius: "999px",
                  border:       "1px solid #fed7aa",
                }}>
                  وفّر {saving}% سنوياً
                </span>
              )}

              {/* Yearly: show actual saving badge */}
              {cycle === "Yearly" && saving > 0 && (
                <span style={{
                  background:   "var(--color-primary)",
                  color:        "#fff",
                  fontSize:     "0.72rem",
                  fontWeight:   700,
                  padding:      "0.1rem 0.45rem",
                  borderRadius: "999px",
                }}>
                  وفّر {saving}%
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Limits ── */}
      {plan.limits.length > 0 && (
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.55rem" }}>
            الحدود
          </p>
          <LimitList limits={plan.limits} />
        </div>
      )}

      {/* ── Features ── */}
      {plan.features.length > 0 && (
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.55rem" }}>
            الميزات
          </p>
          <FeatureList features={plan.features} />
        </div>
      )}

      {/* ── CTA ── */}
      <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
        <button
          suppressHydrationWarning
          type="button"
          onClick={handleClick}
          disabled={isDisabled}
          style={{
            width:        "100%",
            padding:      "0.8rem 1rem",
            borderRadius: "var(--radius-md)",
            border:       ctaStyle.border ?? "none",
            background:   ctaStyle.bg,
            color:        ctaStyle.color,
            cursor:       isCurrent ? "default" : isLoadingIntent ? "wait" : "pointer",
            fontFamily:   "inherit",
            fontSize:     "0.97rem",
            fontWeight:   700,
            transition:   "opacity 0.2s, transform 0.15s",
            opacity:      isLoadingIntent && !isCurrent ? 0.65 : 1,
            letterSpacing: "0.01em",
          }}
        >
          {isLoadingIntent && !isCurrent ? "جارٍ التحميل..." : CTA_LABEL[kind]}
        </button>

        {/* Upgrade nudge for authenticated users on lower plans */}
        {kind === "upgrade" && (
          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--color-text-muted)", margin: "0.5rem 0 0" }}>
            يمكنك الترقية في أي وقت بدون فقدان بياناتك
          </p>
        )}
      </div>
    </div>
  );
}
