"use client";

import { useState, useEffect } from "react";
import { subscriptionApi } from "@/features/subscription/api";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";

interface UseSubscriptionResult {
  subscription: CurrentSubscriptionResponse | null;
  loading: boolean;
}

/**
 * Fetches the current user's active subscription entitlements.
 * Returns null while loading or when the user has no account.
 * Safe to call in any client component — results are cached per mount.
 */
export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<CurrentSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    subscriptionApi
      .getCurrent()
      .then((data) => { if (!cancelled) setSubscription(data); })
      .catch(() => { /* no active subscription or unauthenticated — keep null */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { subscription, loading };
}
