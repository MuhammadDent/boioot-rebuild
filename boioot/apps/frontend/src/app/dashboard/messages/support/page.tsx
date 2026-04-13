"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page exists only as a safety net for old bookmarks.
// The support conversation flow is now handled directly in /dashboard/messages?support=1

export default function SupportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/messages?support=1");
  }, [router]);

  return null;
}
