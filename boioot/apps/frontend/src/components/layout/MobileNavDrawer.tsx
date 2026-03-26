"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export interface NavItem {
  href: string;
  label: string;
  exact: boolean;
}

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  navLinks: NavItem[];
  isAuthenticated: boolean;
  onAddAd: () => void;
  onAddRequest: () => void;
}

export default function MobileNavDrawer({
  isOpen,
  onClose,
  pathname,
  navLinks,
  isAuthenticated,
  onAddAd,
  onAddRequest,
}: MobileNavDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Focus the drawer when it opens
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`mobile-overlay${isOpen ? " mobile-overlay--visible" : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* RTL Drawer — opens from the right */}
      <div
        ref={drawerRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الرئيسية"
        tabIndex={-1}
        className={`mobile-drawer${isOpen ? " mobile-drawer--open" : ""}`}
      >
        {/* Drawer header */}
        <div className="mobile-drawer__header">
          <span className="mobile-drawer__title">القائمة</span>
          <button
            type="button"
            onClick={onClose}
            className="mobile-drawer__close"
            aria-label="إغلاق القائمة"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="mobile-drawer__nav" aria-label="روابط التنقل">
          {navLinks.map(({ href, label, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`mobile-drawer__link${active ? " mobile-drawer__link--active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mobile-drawer__divider" />

        {/* CTA buttons */}
        <div className="mobile-drawer__ctas">
          <button
            type="button"
            onClick={() => { onClose(); onAddAd(); }}
            className="mobile-drawer__cta-primary"
          >
            + أضف إعلان
          </button>
          <button
            type="button"
            onClick={() => { onClose(); onAddRequest(); }}
            className="mobile-drawer__cta-secondary"
          >
            + أضف طلب
          </button>
        </div>

        {/* Auth links (only when not logged in) */}
        {!isAuthenticated && (
          <>
            <div className="mobile-drawer__divider" />
            <div className="mobile-drawer__auth">
              <Link
                href="/login"
                onClick={onClose}
                className="mobile-drawer__login"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="mobile-drawer__register"
              >
                إنشاء حساب
              </Link>
            </div>
          </>
        )}

        {isAuthenticated && (
          <>
            <div className="mobile-drawer__divider" />
            <div className="mobile-drawer__auth">
              <Link
                href="/dashboard"
                onClick={onClose}
                className="mobile-drawer__login"
              >
                لوحة التحكم
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
