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

// ─── Nav item types ───────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  roles?: string[];
  badge?: number;
};

// ─── Nav definitions ──────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "لوحة التحكم",
    exact: true,
    icon: <Ic d={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>} />,
  },
  {
    href: "/dashboard/profile",
    label: "الملف الشخصي",
    exact: true,
    icon: <Ic d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />,
  },
  {
    href: "/dashboard/messages",
    label: "الرسائل",
    exact: false,
    icon: <Ic d={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>} />,
  },
  {
    href: "/dashboard/my-requests",
    label: "طلباتي",
    exact: false,
    icon: <Ic d={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></>} />,
  },
  {
    href: "/dashboard/listings",
    label: "الطلبات",
    exact: false,
    roles: ["Admin", "CompanyOwner", "Broker", "Agent"],
    icon: <Ic d={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></>} />,
  },
  {
    href: "/dashboard/my-listings",
    label: "إعلاناتي",
    exact: false,
    roles: ["Admin", "CompanyOwner", "Broker", "Agent", "Owner"],
    icon: <Ic d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>} />,
  },
  {
    href: "/dashboard/projects",
    label: "المشاريع",
    exact: false,
    roles: ["Admin", "CompanyOwner"],
    icon: <Ic d={<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>} />,
  },
];

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

  function visibleItems() {
    if (!user) return [];
    return NAV_ITEMS.filter(
      (item) => !item.roles || item.roles.includes(user.role)
    );
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
          {visibleItems().map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={[
                "dash-sbar__link",
                isActive(item.href, item.exact) ? "dash-sbar__link--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="dash-sbar__badge">{item.badge}</span>
              )}
            </Link>
          ))}
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
