"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__logo">
          بيوت
        </Link>

        <nav className="site-header__nav">
          <Link href="/" className="site-header__link">الرئيسية</Link>
          <Link href="/properties" className="site-header__link">العقارات</Link>
          <Link href="/projects" className="site-header__link">المشاريع</Link>

          {isAuthenticated ? (
            <>
              <Link
                href={user?.role === "Admin" ? "/admin" : "/dashboard"}
                className="btn btn-outline btn-sm"
              >
                {user?.role === "Admin" ? "لوحة الإدارة" : "لوحة التحكم"}
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                تسجيل الخروج
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              تسجيل الدخول
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

