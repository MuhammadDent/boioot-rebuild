"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";

/**
 * Combines auth state with the auth-gate modal.
 *
 * `guard(fn)` — runs `fn` immediately if authenticated, otherwise opens
 *   the "يلزم تسجيل الدخول" modal so the user can choose login / register.
 *
 * `guardHref(href)` — navigates to `href` if authenticated, otherwise opens
 *   the modal.  Keeps the user on the current page if they dismiss.
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { openAuthModal } = useAuthGate();
  const router = useRouter();

  const guard = useCallback(
    (fn: () => void) => {
      if (isAuthenticated) {
        fn();
      } else {
        openAuthModal();
      }
    },
    [isAuthenticated, openAuthModal]
  );

  const guardHref = useCallback(
    (href: string) => {
      if (isAuthenticated) {
        router.push(href);
      } else {
        openAuthModal();
      }
    },
    [isAuthenticated, openAuthModal, router]
  );

  return { isAuthenticated, isLoading, user, guard, guardHref, openAuthModal };
}
