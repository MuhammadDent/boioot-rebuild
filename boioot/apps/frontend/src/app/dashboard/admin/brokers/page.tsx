"use client";

import { RoleUsersPage } from "@/features/admin/components/RoleUsersPage";

export default function AdminBrokersPage() {
  return (
    <RoleUsersPage
      config={{
        role: "Broker",
        title: "الوسطاء العقاريون",
        singularLabel: "وسيط",
        emptyMessage: "لا يوجد وسطاء عقاريون مطابقون لهذه المعايير.",
      }}
    />
  );
}
