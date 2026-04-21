using Boioot.Application.Features.Notifications.Models;

namespace Boioot.Infrastructure.Features.Notifications;

public static class NotificationTemplateRegistry
{
    public static IReadOnlyDictionary<string, NotificationTemplateDefinition> Templates { get; } =
        new Dictionary<string, NotificationTemplateDefinition>(StringComparer.OrdinalIgnoreCase)
        {
            ["buyer_request_matched"] = new(
                Key: "buyer_request_matched",
                TitleTemplate: "طلب عقاري مناسب لعقاراتك",
                BodyTemplate: "نشر {actorName} طلباً في {city} قد يناسب عروضك المتاحة: {requestTitle}. افتح الطلب الآن وتواصل مع العميل قبل فوات الفرصة.",
                DefaultPriority: 2,
                Enabled: true),

            ["verification_approved"] = new(
                Key: "verification_approved",
                TitleTemplate: "تم توثيق حسابك بنجاح",
                BodyTemplate: "تهانينا، تمت الموافقة على طلب التوثيق. حسابك الآن أكثر موثوقية لدى العملاء، ويمكنك متابعة استخدام بيوت بثقة أكبر.",
                DefaultPriority: 3,
                Enabled: true),

            ["verification_rejected"] = new(
                Key: "verification_rejected",
                TitleTemplate: "طلب التوثيق يحتاج إلى تعديل",
                BodyTemplate: "لم نتمكن من قبول طلب التوثيق حالياً.{rejectionReasonText} يرجى مراجعة البيانات أو المستندات وإعادة التقديم عند الجاهزية.",
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