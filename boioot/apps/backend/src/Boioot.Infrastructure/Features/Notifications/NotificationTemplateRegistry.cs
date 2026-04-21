using Boioot.Application.Features.Notifications.Models;

namespace Boioot.Infrastructure.Features.Notifications;

public static class NotificationTemplateRegistry
{
    public static IReadOnlyDictionary<string, NotificationTemplateDefinition> Templates { get; } =
        new Dictionary<string, NotificationTemplateDefinition>(StringComparer.OrdinalIgnoreCase)
        {
            ["buyer_request_matched"] = new(
                Key: "buyer_request_matched",
                TitleTemplate: "طلب عقاري جديد مطابق",
                BodyTemplate: "نشر {actorName} طلباً جديداً قد يناسب عقاراتك: {requestTitle}",
                DefaultPriority: 2,
                Enabled: true),

            ["verification_approved"] = new(
                Key: "verification_approved",
                TitleTemplate: "تمت الموافقة على طلب التوثيق",
                BodyTemplate: "تهانينا! تمت مراجعة طلبك والموافقة عليه. حسابك الآن موثّق.",
                DefaultPriority: 3,
                Enabled: true),

            ["verification_rejected"] = new(
                Key: "verification_rejected",
                TitleTemplate: "تم رفض طلب التوثيق",
                BodyTemplate: "عذراً، تم رفض طلب التوثيق.{rejectionReasonText}",
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