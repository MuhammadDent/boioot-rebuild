"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// ─── Icon helper ──────────────────────────────────────────────────────────────

function Ic({ d, size = 18 }: { d: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {d}
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  badge?: number;
};

type NavDivider = {
  divider: true;
  label: string;
};

type NavEntry = NavItem | NavDivider;

function isDivider(e: NavEntry): e is NavDivider {
  return "divider" in e && e.divider === true;
}

// ─── Icon paths (reused across roles) ────────────────────────────────────────

const ICONS = {
  subscription: (
    <Ic d={<><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></>} />
  ),
  dashboard: (
    <Ic d={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>} />
  ),
  profile: (
    <Ic d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />
  ),
  messages: (
    <Ic d={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>} />
  ),
  requests: (
    <Ic d={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></>} />
  ),
  listings: (
    <Ic d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>} />
  ),
  projects: (
    <Ic d={<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>} />
  ),
  clients: (
    <Ic d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />
  ),
  team: (
    <Ic d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />
  ),
  users: (
    <Ic d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />
  ),
  companies: (
    <Ic d={<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>} />
  ),
  system: (
    <Ic d={<><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 1.41 13.4M4.93 19.07A10 10 0 0 1 3.52 5.67M19.07 19.07a10 10 0 0 1-13.4 1.41M5.67 3.52A10 10 0 0 1 19.07 4.93" /></>} />
  ),
  sessions: (
    <Ic d={<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>} />
  ),
  content: (
    <Ic d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>} />
  ),
  verification: (
    <Ic d={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><polyline points="9 11 12 14 22 4" /></>} />
  ),
};

// ─── Shared base items (لوحة + ملف + رسائل) ──────────────────────────────────

const BASE: NavItem[] = [
  { href: "/dashboard",          label: "لوحة التحكم",   exact: true,  icon: ICONS.dashboard },
  { href: "/dashboard/profile",  label: "الملف الشخصي",  exact: true,  icon: ICONS.profile   },
  { href: "/dashboard/sessions", label: "الجلسات النشطة", exact: true,  icon: ICONS.sessions  },
  { href: "/dashboard/messages", label: "الرسائل",        exact: false, icon: ICONS.messages  },
];

// ─── Per-role sidebar configuration ──────────────────────────────────────────
//
// Each key matches the `role` string returned by the backend (case-sensitive).
// To add a new role: add a new key + array here — no other code changes needed.

const SIDEBAR_CONFIG: Record<string, NavEntry[]> = {

  // ── Regular user ──────────────────────────────────────────────────────────
  User: [
    ...BASE,
    { href: "/dashboard/my-requests",      label: "طلباتي",         exact: false, icon: ICONS.requests     },
    { href: "/dashboard/verification",     label: "التوثيق",        exact: false, icon: ICONS.verification },
  ],

  // ── Property owner ────────────────────────────────────────────────────────
  Owner: [
    ...BASE,
    { href: "/dashboard/my-listings",            label: "إعلاناتي",       exact: false, icon: ICONS.listings     },
    { href: "/dashboard/my-requests",            label: "طلباتي",         exact: false, icon: ICONS.requests     },
    { href: "/dashboard/verification",           label: "التوثيق",        exact: false, icon: ICONS.verification },
    { href: "/dashboard/subscription",           label: "اشتراكي",        exact: true,  icon: ICONS.subscription },
    { href: "/dashboard/subscription/plans",     label: "باقات الاشتراك", exact: false, icon: ICONS.subscription },
  ],

  // ── Real-estate agent ─────────────────────────────────────────────────────
  Agent: [
    ...BASE,
    { href: "/dashboard/clients",                label: "العملاء",        exact: false, icon: ICONS.clients      },
    { href: "/dashboard/my-listings",            label: "إعلاناتي",       exact: false, icon: ICONS.listings     },
    { href: "/dashboard/my-requests",            label: "طلباتي",         exact: false, icon: ICONS.requests     },
    { href: "/dashboard/verification",           label: "التوثيق",        exact: false, icon: ICONS.verification },
    { href: "/dashboard/subscription",           label: "اشتراكي",        exact: true,  icon: ICONS.subscription },
    { href: "/dashboard/subscription/plans",     label: "باقات الاشتراك", exact: false, icon: ICONS.subscription },
  ],

  // ── Broker / office ───────────────────────────────────────────────────────
  Broker: [
    ...BASE,
    { href: "/dashboard/team",                   label: "الفريق",         exact: false, icon: ICONS.team         },
    { href: "/dashboard/listings",               label: "الإعلانات",      exact: false, icon: ICONS.listings     },
    { href: "/dashboard/my-requests",            label: "الطلبات",        exact: false, icon: ICONS.requests     },
    { href: "/dashboard/verification",           label: "التوثيق",        exact: false, icon: ICONS.verification },
    { href: "/dashboard/subscription",           label: "اشتراكي",        exact: true,  icon: ICONS.subscription },
    { href: "/dashboard/subscription/plans",     label: "باقات الاشتراك", exact: false, icon: ICONS.subscription },
  ],

  // ── Company owner / developer ─────────────────────────────────────────────
  CompanyOwner: [
    ...BASE,
    { href: "/dashboard/projects",               label: "المشاريع",       exact: false, icon: ICONS.projects     },
    { href: "/dashboard/listings",               label: "الإعلانات",      exact: false, icon: ICONS.listings     },
    { href: "/dashboard/my-requests",            label: "الطلبات",        exact: false, icon: ICONS.requests     },
    { href: "/dashboard/verification",           label: "التوثيق",        exact: false, icon: ICONS.verification },
    { href: "/dashboard/subscription",           label: "اشتراكي",        exact: true,  icon: ICONS.subscription },
    { href: "/dashboard/subscription/plans",     label: "باقات الاشتراك", exact: false, icon: ICONS.subscription },
  ],

  // ── Admin ─────────────────────────────────────────────────────────────────
  // Admin has a separate set — no profile/messages here (they use /dashboard/admin/*)
  Admin: [
    { href: "/dashboard", label: "لوحة التحكم", exact: true, icon: ICONS.dashboard },

    // ── الأشخاص ──
    { divider: true, label: "الأشخاص" },
    { href: "/dashboard/admin/users",    label: "المستخدمون",  exact: false, icon: ICONS.users     },

    // ── الأعمال ──
    { divider: true, label: "الأعمال" },
    { href: "/dashboard/admin/companies", label: "الشركات",    exact: false, icon: ICONS.companies },
    { href: "/dashboard/listings",        label: "العقارات",   exact: false, icon: ICONS.listings  },
    { href: "/dashboard/projects",        label: "المشاريع",   exact: false, icon: ICONS.projects  },

    // ── الإدارة ──
    { divider: true, label: "الإدارة" },
    { href: "/dashboard/admin/content",   label: "محتوى الموقع", exact: false, icon: ICONS.content },
    { href: "/dashboard/admin/system",    label: "النظام",        exact: false, icon: ICONS.system  },
  ],
};

// ─── Fallback: shown when role is unknown / null ───────────────────────────

const FALLBACK_ITEMS: NavItem[] = [BASE[0], BASE[1]]; // لوحة التحكم + الملف الشخصي

// ─── DashboardSidebar ─────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function DashboardSidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function visibleItems(): NavEntry[] {
    if (!user) return [];
    return SIDEBAR_CONFIG[user.role] ?? FALLBACK_ITEMS;
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  const initial = user?.fullName?.charAt(0).toUpperCase() ?? "؟";

  return (
    <>
      {/* Overlay (mobile) */}
      {open && (
        <div
          className="dash-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={["dash-sbar", open ? "dash-sbar--open" : ""].filter(Boolean).join(" ")}>

        {/* Nav items */}
        <nav className="dash-sbar__nav" aria-label="قائمة لوحة التحكم">
          {visibleItems().map((entry, i) => {
            if (isDivider(entry)) {
              return (
                <div key={`divider-${i}`} className="dash-sbar__section-label">
                  {entry.label}
                </div>
              );
            }
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={onClose}
                className={[
                  "dash-sbar__link",
                  isActive(entry.href, entry.exact) ? "dash-sbar__link--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {entry.icon}
                <span>{entry.label}</span>
                {entry.badge != null && entry.badge > 0 && (
                  <span className="dash-sbar__badge">{entry.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: user info + logout */}
        <div className="dash-sbar__footer">
          {user && (
            <div className="dash-sbar__user">
              <div className="dash-sbar__avatar">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt="صورة المستخدم"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  initial
                )}
              </div>
              <div className="dash-sbar__user-info">
                <span className="dash-sbar__user-name">{user.fullName}</span>
                <span className="dash-sbar__user-role">{user.role}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="dash-sbar__logout"
            type="button"
          >
            <Ic
              d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>}
              size={16}
            />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
