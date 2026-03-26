"use client";

// ─── Admin Profile Page ────────────────────────────────────────────────────────
//
// Profile management for Admin and Staff users — rendered inside the AdminLayout
// (AdminToolbar + AdminSidebar) rather than the CustomerLayout.
//
// Reuses the same profile component as the customer profile page.
// The admin layout is enforced by /dashboard/admin/layout.tsx.

export { default } from "@/app/dashboard/profile/page";
