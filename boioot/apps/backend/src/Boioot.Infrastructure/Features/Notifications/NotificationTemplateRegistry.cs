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
        };
}