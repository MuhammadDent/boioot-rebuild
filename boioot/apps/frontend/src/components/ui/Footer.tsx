import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
  disabled?: boolean;
}

interface NavGroup {
  heading: string;
  links: NavLink[];
}

// ── Data ──────────────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "الاستكشاف",
    links: [
      { href: "/",              label: "الرئيسية" },
      { href: "/properties",    label: "العقارات" },
      { href: "/projects",      label: "المشاريع" },
      { href: "/daily-rentals", label: "الإيجار اليومي" },
      { href: "/blog",          label: "المدونة" },
    ],
  },
  {
    heading: "الخدمات",
    links: [
      { href: "/post-ad",  label: "أضف إعلاناً" },
      { href: "/requests", label: "تقديم طلب" },
      { href: "/pricing",  label: "الأسعار والباقات" },
    ],
  },
  {
    heading: "الشركة",
    links: [
      { href: "#", label: "عن بيوت",         disabled: true },
      { href: "#", label: "تواصل معنا",       disabled: true },
      { href: "#", label: "الأسئلة الشائعة", disabled: true },
    ],
  },
  {
    heading: "قانوني",
    links: [
      { href: "#", label: "سياسة الخصوصية",  disabled: true },
      { href: "#", label: "الشروط والأحكام", disabled: true },
    ],
  },
];

const TRUST_ITEMS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    value: "موثوقة",
    label: "منصة معتمدة",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    value: "7 / 24",
    label: "دعم متواصل",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    value: "سوريا",
    label: "تغطية شاملة",
  },
];

const SOCIAL_LINKS = [
  {
    href: "#",
    label: "فيسبوك",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "إنستغرام",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "تويتر X",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "واتساب",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
  },
  {
    href: "#",
    label: "لينكدإن",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

// ── Footer Component ───────────────────────────────────────────────────────────

export default function Footer() {
  return (
    <footer className="ft" role="contentinfo" aria-label="تذييل الصفحة">

      {/* Top accent stripe */}
      <div className="ft__stripe" aria-hidden="true" />

      {/* ── Main body ─────────────────────────────────────────────── */}
      <div className="ft__body">
        <div className="ft__container">

          {/* Brand column */}
          <div className="ft__brand">

            {/* Wordmark */}
            <Link href="/" className="ft__wordmark" aria-label="بيوت — الصفحة الرئيسية">
              Boioot
            </Link>

            <p className="ft__tagline">
              منصة عقارية متكاملة لشراء وبيع وتأجير العقارات في سوريا.
              نربط المشترين بالبائعين والمستأجرين بالملاك.
            </p>

            {/* CTAs */}
            <div className="ft__actions">
              <Link href="/post-ad" className="ft__btn-primary">
                أضف إعلانك
              </Link>
              <Link href="/requests" className="ft__btn-ghost">
                تقديم طلب
              </Link>
            </div>

            {/* Trust stats */}
            <div className="ft__trust">
              {TRUST_ITEMS.map(item => (
                <div key={item.label} className="ft__trust-item">
                  <span className="ft__trust-icon">{item.icon}</span>
                  <span className="ft__trust-value">{item.value}</span>
                  <span className="ft__trust-label">{item.label}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Navigation */}
          <nav className="ft__nav" aria-label="روابط الموقع">
            {NAV_GROUPS.map(group => (
              <div key={group.heading} className="ft__group">
                <p className="ft__group-heading">{group.heading}</p>
                <ul className="ft__group-list" role="list">
                  {group.links.map(link =>
                    link.disabled ? (
                      <li key={link.label}>
                        <span className="ft__link ft__link--off" aria-label={`${link.label} — قريباً`}>
                          {link.label}
                        </span>
                      </li>
                    ) : (
                      <li key={link.label}>
                        <Link href={link.href} className="ft__link">
                          {link.label}
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </nav>

        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────── */}
      <div className="ft__bottom">
        <div className="ft__container ft__container--bottom">

          {/* Copyright */}
          <p className="ft__copy">
            © 2026 بيوت سوريا. جميع الحقوق محفوظة.
          </p>

          {/* Social icons */}
          <div className="ft__social" role="list" aria-label="حساباتنا على التواصل الاجتماعي">
            {SOCIAL_LINKS.map(s => (
              <a
                key={s.label}
                href={s.href}
                className="ft__social-btn"
                aria-label={s.label}
                rel="noopener noreferrer"
                role="listitem"
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* Legal links */}
          <div className="ft__legal">
            <span className="ft__legal-link ft__legal-link--off">سياسة الخصوصية</span>
            <span className="ft__legal-sep" aria-hidden="true" />
            <span className="ft__legal-link ft__legal-link--off">الشروط والأحكام</span>
          </div>

        </div>
      </div>

    </footer>
  );
}
