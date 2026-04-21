using Boioot.Application.Features.Notifications.Models;

namespace Boioot.Infrastructure.Features.Notifications;

public static class NotificationTemplateRegistry
{
    public static IReadOnlyDictionary<string, NotificationTemplateDefinition> Templates { get; } =
        new Dictionary<string, NotificationTemplateDefinition>(StringComparer.OrdinalIgnoreCase)
        {
            ["buyer_request_matched"] = new(
                Key: "buyer_request_matched",
                TitleTemplate: "طلب عقاري مهم يناسب عروضك",
                BodyTemplate: "يوجد طلب جديد من {actorName} في {city} قد يناسب عقاراتك المتاحة: {requestTitle}. راجع التفاصيل الآن وتواصل مع العميل قبل انتقاله لعرض آخر.",
                DefaultPriority: 2,
                Enabled: true),

            ["verification_approved"] = new(
                Key: "verification_approved",
                TitleTemplate: "تم اعتماد توثيق حسابك",
                BodyTemplate: "تمت الموافقة على طلب التوثيق بنجاح. أصبح حسابك أكثر موثوقية أمام العملاء، ويمكنك متابعة نشر وإدارة عروضك بثقة أكبر.",
                DefaultPriority: 3,
                Enabled: true),

            ["verification_rejected"] = new(
                Key: "verification_rejected",
                TitleTemplate: "طلب التوثيق بحاجة إلى مراجعة",
                BodyTemplate: "راجعنا طلب التوثيق ونحتاج إلى بعض التعديلات قبل اعتماده.{rejectionReasonText}",
                DefaultPriority: 3,
                Enabled: true),

            ["subscription_expiring"] = new(
                Key: "subscription_expiring",
                TitleTemplate: "اشتراكك أوشك على الانتهاء",
                BodyTemplate: "ينتهي اشتراكك خلال {daysLeft} يوم. يرجى التجديد لتجنب انقطاع الخدمة.",
                DefaultPriority: 2,
                Enabled: true),

            ["subscription_limit_warning"] = new(
                Key: "subscription_limit_warning",
                TitleTemplate: "اقتربت من حد الاشتراك",
                BodyTemplate: "استخدمت {used} من أصل {limit} في خطة اشتراكك.",
                DefaultPriority: 2,
                Enabled: true),

            ["booking_created"] = new(
                Key: "booking_created",
                TitleTemplate: "طلب حجز جديد",
                BodyTemplate: "وصل طلب حجز جديد لعقارك {propertyTitle}. راجع الطلب وأكده أو ارفضه من لوحة التحكم.",
                DefaultPriority: 2,
                Enabled: true),

            ["booking_confirmed"] = new(
                Key: "booking_confirmed",
                TitleTemplate: "تم تأكيد طلب الحجز",
                BodyTemplate: "تم تأكيد حجزك للعقار {propertyTitle}.",
                DefaultPriority: 2,
                Enabled: true),

            ["booking_approved"] = new(
                Key: "booking_approved",
                TitleTemplate: "تمت الموافقة على طلب الحجز",
                BodyTemplate: "وافق المالك على حجزك للعقار {propertyTitle}. يمكنك متابعة تفاصيل الحجز من لوحة التحكم.",
                DefaultPriority: 2,
                Enabled: true),

            ["booking_rejected"] = new(
                Key: "booking_rejected",
                TitleTemplate: "تم رفض طلب الحجز",
                BodyTemplate: "تم رفض طلب حجزك للعقار {propertyTitle}.",
                DefaultPriority: 2,
                Enabled: true),

            ["booking_completed"] = new(
                Key: "booking_completed",
                TitleTemplate: "اكتمل الحجز",
                BodyTemplate: "تم إكمال حجزك للعقار {propertyTitle}.",
                DefaultPriority: 1,
                Enabled: true),
        };
}