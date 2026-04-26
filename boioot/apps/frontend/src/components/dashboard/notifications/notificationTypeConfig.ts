import type { NotificationItem } from "@/features/notifications/api";

export interface NotificationBadgeConfig {
  label: string;
  color: string;
  bg: string;
}

export interface NotificationTypeConfig {
  icon: string;
  badge?: NotificationBadgeConfig;
}

const DEFAULT_CONFIG: NotificationTypeConfig = { icon: "🔔" };

export const NOTIFICATION_TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
  listing_approved:             { icon: "✅" },
  listing_rejected:             { icon: "❌" },
  listing_featured:             { icon: "⭐" },
  subscription_approved:        { icon: "🎉", badge: { label: "موافقة",        color: "#166534", bg: "#dcfce7" } },
  subscription_rejected:        { icon: "❌", badge: { label: "رفض",           color: "#b91c1c", bg: "#fee2e2" } },
  subscription_missing_info:    { icon: "📋", badge: { label: "استكمال مطلوب", color: "#92400e", bg: "#fef3c7" } },
  subscription_activated:       { icon: "🚀", badge: { label: "مُفعَّل",       color: "#166534", bg: "#bbf7d0" } },
  payment_received:             { icon: "💳" },
  payment_submitted:            { icon: "📤" },
  payment_pending:              { icon: "⏳" },
  new_request:                  { icon: "📨" },
  buyer_request_matched:        { icon: "📨" },
  request_comment:              { icon: "💬" },
  request_reply:                { icon: "↩️" },
  request_discussion_activity:  { icon: "💬" },
  special_request_new:          { icon: "📋" },
  trial_warning:                { icon: "⚠️" },
  trial_limit_reached:          { icon: "🚫" },
  system_alert:                 { icon: "🔔" },
  new_message:                  { icon: "✉️" },
  new_comment:                  { icon: "💬" },
  verification_new_request:     { icon: "📋", badge: { label: "طلب جديد",       color: "#1d4ed8", bg: "#dbeafe" } },
  verification_approved:        { icon: "✅", badge: { label: "موافقة",        color: "#166534", bg: "#dcfce7" } },
  verification_rejected:        { icon: "📝", badge: { label: "بحاجة مراجعة",  color: "#92400e", bg: "#fef3c7" } },
  verification_needs_info:      { icon: "📝", badge: { label: "معلومات إضافية", color: "#92400e", bg: "#fef3c7" } },
  verification_updated:         { icon: "🔔" },
};

export function getNotificationTypeConfig(type: string): NotificationTypeConfig {
  return NOTIFICATION_TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
}

export function getNotificationActionLabel(notification: NotificationItem): string | null {
  if (notification.relatedEntityType === "SubscriptionPaymentRequest") {
    if (notification.type === "subscription_approved") return "عرض الموافقة";
    if (notification.type === "subscription_rejected") return "عرض سبب الرفض";
    if (notification.type === "subscription_missing_info") return "عرض المطلوب";
    return "عرض الرد";
  }

  if (notification.relatedEntityType === "BuyerRequest" || notification.relatedEntityType === "SpecialRequest") {
    return "عرض الطلب";
  }

  if (notification.relatedEntityType === "VerificationRequest") {
    return "عرض طلب التوثيق";
  }

  return null;
}

export function shouldOpenSubscriptionRequestModal(notification: NotificationItem): boolean {
  return notification.relatedEntityType === "SubscriptionPaymentRequest" && Boolean(notification.relatedEntityId);
}

export function resolveNotificationTarget(notification: NotificationItem): string | null {
  const { relatedEntityId, relatedEntityType, type } = notification;

  // Subscription types open a modal — return null so the caller handles them
  if (
    relatedEntityType === "SubscriptionPaymentRequest" ||
    type === "subscription_approved" ||
    type === "subscription_rejected" ||
    type === "subscription_missing_info" ||
    type === "subscription_activated"
  ) {
    return null;
  }

  // Entity-id-based routes (highest specificity)
  if (relatedEntityType && relatedEntityId) {
    if (relatedEntityType === "BuyerRequest")        return `/requests/${relatedEntityId}`;
    if (relatedEntityType === "Property")            return `/dashboard/properties/${relatedEntityId}`;
    if (relatedEntityType === "SpecialRequest")      return `/dashboard/requests/${relatedEntityId}`;
    if (relatedEntityType === "VerificationRequest") return `/dashboard/verification/${relatedEntityId}`;
    if (relatedEntityType === "Booking")             return `/dashboard/bookings`;
  }

  // Type-based routes
  if (type === "new_message") return "/dashboard/messages";

  if (type === "request_comment" || type === "request_reply" || type === "request_discussion_activity") {
    return relatedEntityId ? `/requests/${relatedEntityId}` : "/dashboard/requests";
  }

  if (
    type === "booking_update"    ||
    type === "booking_confirmed" ||
    type === "booking_rejected"  ||
    type === "booking_cancelled" ||
    type === "booking_approved_awaiting_payment" ||
    type === "booking_payment_submitted"
  ) {
    return "/dashboard/bookings";
  }

  if (
    type === "verification_update"     ||
    type === "verification_approved"   ||
    type === "verification_rejected"   ||
    type === "verification_needs_info" ||
    type === "verification_updated"
  ) {
    return relatedEntityId
      ? `/dashboard/verification/${relatedEntityId}`
      : "/dashboard/verification";
  }

  if (type === "subscription_update") return "/dashboard/subscription";

  if (
    type === "listing_approved" ||
    type === "listing_rejected" ||
    type === "listing_featured" ||
    type === "property_update"
  ) {
    return relatedEntityId
      ? `/dashboard/properties/${relatedEntityId}`
      : "/dashboard/properties";
  }

  if (type === "buyer_request_matched" || type === "new_request") {
    return relatedEntityId ? `/requests/${relatedEntityId}` : "/dashboard/requests";
  }

  if (type === "trial_warning" || type === "trial_limit_reached") {
    return "/dashboard/subscription";
  }

  if (type === "system_alert") return "/dashboard";

  return null;
}

export function relativeNotificationTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 30) return `منذ ${days} يوم`;

  return new Date(dateStr).toLocaleDateString("ar-SY");
}

export function fullNotificationDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ar-SY", { dateStyle: "medium", timeStyle: "short" });
}
