import Link from "next/link";
import Image from "next/image";

// ── Navigation groups ────────────────────────────────────────────────────────

const NAV_GROUPS: Array<{
  heading: string;
  links: Array<{ href: string; label: string; placeholder?: boolean }>;
}> = [
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
      { href: "#", label: "عن بيوت",          placeholder: true }, // TODO: /about
      { href: "#", label: "تواصل معنا",        placeholder: true }, // TODO: /contact
      { href: "#", label: "الأسئلة الشائعة",  placeholder: true }, // TODO: /faq
    ],
  },
  {
    heading: "قانوني",
    links: [
      { href: "#", label: "سياسة الخصوصية",  placeholder: true }, // TODO: /privacy
      { href: "#", label: "الشروط والأحكام", placeholder: true }, // TODO: /terms
    ],
  },
];

// ── Social icons (inline SVG to avoid dependencies) ──────────────────────────

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { href: "#", label: "فيسبوك",   Icon: IconFacebook  },
  { href: "#", label: "إنستغرام", Icon: IconInstagram },
  { href: "#", label: "تويتر X",  Icon: IconX         },
  { href: "#", label: "واتساب",   Icon: IconWhatsApp  },
  { href: "#", label: "لينكدإن",  Icon: IconLinkedIn  },
];

// ── Footer ───────────────────────────────────────────────────────────────────

export default function Footer() {
  const year = 2026; // Static — update annually or make dynamic with suppressHydrationWarning

  return (
    <footer className="footer" role="contentinfo">

      {/* ── Main body ── */}
      <div className="footer__body">
        <div className="footer__inner">

          {/* Brand column */}
          <div className="footer__brand">
            <Link href="/" className="footer__logo-link" aria-label="بيوت — الصفحة الرئيسية">
              <Image
                src="/logo-boioot.png"
                alt="بيوت"
                width={160}
                height={61}
                style={{ objectFit: "contain", width: 160, height: 61, filter: "brightness(0) invert(1)" }}
              />
            </Link>

            <p className="footer__tagline">
              منصة عقارية متكاملة لشراء وبيع وتأجير العقارات في سوريا — نربط المشترين بالبائعين والمستأجرين بالملاك بكل سهولة وشفافية.
            </p>

            <div className="footer__brand-actions">
              <Link href="/post-ad" className="footer__cta-btn">
                أضف إعلانك الآن
              </Link>
              <Link href="/requests" className="footer__cta-ghost">
                تقديم طلب
              </Link>
            </div>

            {/* Trust badges row */}
            <div className="footer__trust">
              <span className="footer__trust-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                منصة موثوقة
              </span>
              <span className="footer__trust-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                دعم 7/24
              </span>
              <span className="footer__trust-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                آلاف المستخدمين
              </span>
            </div>
          </div>

          {/* Navigation columns */}
          <nav className="footer__nav" aria-label="روابط الموقع">
            {NAV_GROUPS.map(group => (
              <div key={group.heading} className="footer__group">
                <h3 className="footer__group-heading">{group.heading}</h3>
                <ul className="footer__group-list">
                  {group.links.map(link => (
                    <li key={link.label}>
                      {link.placeholder ? (
                        <span className="footer__link footer__link--soon">
                          {link.label}
                          <span className="footer__soon-badge">قريباً</span>
                        </span>
                      ) : (
                        <Link href={link.href} className="footer__link">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

        </div>
      </div>

      {/* ── Divider ── */}
      <div className="footer__divider" />

      {/* ── Social + tagline row ── */}
      <div className="footer__social-row">
        <div className="footer__inner footer__inner--social">
          <p className="footer__social-label">تابعنا على</p>
          <div className="footer__social-icons">
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                className="footer__social-icon"
                aria-label={label}
                rel="noopener noreferrer"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="footer__bottom">
        <div className="footer__inner footer__inner--bottom">
          <p className="footer__copyright">
            © {year} بيوت سوريا — جميع الحقوق محفوظة
          </p>
          <div className="footer__bottom-links">
            <span className="footer__link footer__link--soon footer__link--inline">
              سياسة الخصوصية
            </span>
            <span className="footer__bottom-sep" aria-hidden="true">·</span>
            <span className="footer__link footer__link--soon footer__link--inline">
              الشروط والأحكام
            </span>
          </div>
        </div>
      </div>

    </footer>
  );
}
