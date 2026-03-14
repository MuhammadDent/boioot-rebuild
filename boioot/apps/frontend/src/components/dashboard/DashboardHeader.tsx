"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function DashboardHeader() {
  const { user } = useAuth();

  return (
    <div className="dash-topbar">
      <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
        لوحة التحكم
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
          مرحباً، {user?.fullName}
        </span>
        <Link href="/" className="btn btn-ghost btn-sm">
          الموقع الرئيسي
        </Link>
      </div>
    </div>
  );
}

