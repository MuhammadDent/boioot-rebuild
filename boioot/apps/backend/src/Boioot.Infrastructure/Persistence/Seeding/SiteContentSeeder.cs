using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Persistence.Seeding;

/// <summary>
/// Seeds the default CMS content items.
/// All items are idempotent — they are only inserted if the key does not exist.
/// </summary>
public sealed class SiteContentSeeder
{
    private readonly BoiootDbContext _ctx;
    private readonly ILogger<SiteContentSeeder> _log;

    public SiteContentSeeder(BoiootDbContext ctx, ILogger<SiteContentSeeder> log)
    {
        _ctx = ctx;
        _log = log;
    }

    public async Task SeedAsync()
    {
        var now = DateTime.UtcNow;
        var added = 0;

        var defaults = new[]
        {
            // ── Home hero ────────────────────────────────────────────────────
            Item("home.hero.title",              "home", "text",     "عنوان الهيرو",          "Hero Title",
                 "ابحث عن منزل أحلامك في سوريا", null, 10),

            Item("home.hero.subtitle",           "home", "textarea", "نص الهيرو",             "Hero Subtitle",
                 "آلاف العقارات المتاحة للبيع والإيجار في مختلف المحافظات السورية.", null, 20),

            Item("home.hero.primaryCtaText",     "home", "text",     "زر الهيرو الرئيسي",    "Hero Primary CTA Text",
                 "تصفّح العقارات", null, 30),

            Item("home.hero.primaryCtaUrl",      "home", "url",      "رابط زر الهيرو الرئيسي", "Hero Primary CTA URL",
                 "/properties", null, 35),

            Item("home.hero.secondaryCtaText",   "home", "text",     "زر الهيرو الثانوي",    "Hero Secondary CTA Text",
                 "أضف طلبك", null, 40),

            Item("home.hero.secondaryCtaUrl",    "home", "url",      "رابط زر الهيرو الثانوي", "Hero Secondary CTA URL",
                 "/requests", null, 45),

            Item("home.hero.image",              "home", "image",    "صورة الهيرو",           "Hero Image URL",
                 "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=1600&q=80", null, 50),

            // ── Navbar ───────────────────────────────────────────────────────
            Item("navbar.loginText",             "navbar", "text",   "نص زر الدخول",          "Login Button Text",
                 "تسجيل الدخول", null, 10),

            Item("navbar.registerText",          "navbar", "text",   "نص زر التسجيل",         "Register Button Text",
                 "إنشاء حساب", null, 20),

            Item("navbar.addListingText",        "navbar", "text",   "نص زر إضافة إعلان",     "Add Listing Button Text",
                 "أضف إعلانك", null, 30),

            Item("navbar.addRequestText",        "navbar", "text",   "نص زر إضافة طلب",       "Add Request Button Text",
                 "أضف طلبك", null, 40),

            // ── Footer ───────────────────────────────────────────────────────
            Item("footer.aboutTitle",            "footer", "text",   "عنوان قسم عن المنصة",  "Footer About Title",
                 "بيوت", null, 10),

            Item("footer.aboutText",             "footer", "textarea", "نص وصف المنصة",       "Footer About Text",
                 "منصة عقارية متكاملة لشراء وبيع وتأجير العقارات في سوريا. نربط الملاك بالمشترين والمستأجرين بكل شفافية وسهولة.", null, 20),

            Item("footer.contactPhone",          "footer", "text",   "رقم الهاتف",            "Contact Phone",
                 "", null, 30),

            Item("footer.contactEmail",          "footer", "text",   "البريد الإلكتروني",      "Contact Email",
                 "", null, 40),

            Item("footer.copyright",             "footer", "text",   "نص حقوق النشر",         "Copyright Text",
                 "© 2026 بيوت سوريا. جميع الحقوق محفوظة.", null, 50),

            // ── General ──────────────────────────────────────────────────────
            Item("general.defaultCountryName",   "general", "text",  "اسم الدولة الافتراضية", "Default Country Name",
                 "سوريا", null, 10),

            Item("general.supportWhatsappUrl",   "general", "url",   "رابط واتساب الدعم",     "Support WhatsApp URL",
                 "", null, 20),

            // ── Special Requests (lead capture) ───────────────────────────────
            Item("special_requests.title",          "home", "text",     "عنوان صفحة الطلبات الخاصة",    "Special Requests Page Title",
                 "الطلبات الخاصة", null, 60),

            Item("special_requests.description",    "home", "textarea", "وصف صفحة الطلبات الخاصة",      "Special Requests Page Description",
                 "هل تبحث عن عقار بمواصفات خاصة؟ أرسل لنا طلبك وسيتواصل معك فريقنا لمساعدتك في العثور على العقار المناسب.", null, 61),

            Item("special_requests.cta_text",       "home", "text",     "نص زر الطلبات الخاصة",         "Special Requests CTA Text",
                 "أضف طلبك الآن", null, 62),

            Item("special_requests.homepage_title", "home", "text",     "عنوان قسم الطلبات في الرئيسية", "Homepage Special Requests Section Title",
                 "هل تبحث عن عقار بمواصفات خاصة؟", null, 63),

            Item("special_requests.homepage_desc",  "home", "textarea", "وصف قسم الطلبات في الرئيسية",  "Homepage Special Requests Section Description",
                 "أرسل طلبك الآن وسنساعدك في العثور على العقار المناسب بأسرع وقت ممكن", null, 64),

            Item("special_requests.homepage_show",  "home", "text",     "إظهار قسم الطلبات في الرئيسية","Show Homepage Special Requests Section",
                 "true", null, 65),
        };

        foreach (var def in defaults)
        {
            var exists = await _ctx.SiteContents.AnyAsync(c => c.Key == def.Key);
            if (!exists)
            {
                def.CreatedAt = now;
                def.UpdatedAt = now;
                _ctx.SiteContents.Add(def);
                added++;
            }
        }

        if (added > 0)
        {
            await _ctx.SaveChangesAsync();
            _log.LogInformation("[CMS] Seeded {Count} site content item(s).", added);
        }
        else
        {
            _log.LogDebug("[CMS] Site content already seeded, skipping.");
        }
    }

    private static SiteContent Item(
        string key, string group, string type,
        string labelAr, string labelEn,
        string? valueAr, string? valueEn,
        int sort) => new()
    {
        Id        = Guid.NewGuid(),
        Key       = key,
        Group     = group,
        Type      = type,
        LabelAr   = labelAr,
        LabelEn   = labelEn,
        ValueAr   = valueAr,
        ValueEn   = valueEn,
        IsActive  = true,
        IsSystem  = true,
        SortOrder = sort,
    };
}
