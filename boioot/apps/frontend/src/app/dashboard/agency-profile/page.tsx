"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgencyProfileRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/profile");
  }, [router]);
  return null;
}
