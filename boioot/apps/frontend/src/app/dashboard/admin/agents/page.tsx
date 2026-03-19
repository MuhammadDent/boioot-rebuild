"use client";

import { RoleUsersPage } from "@/features/admin/components/RoleUsersPage";

export default function AdminAgentsPage() {
  return (
    <RoleUsersPage
      config={{
        role: "Agent",
        title: "الوكلاء العقاريون",
        singularLabel: "وكيل",
        emptyMessage: "لا يوجد وكلاء عقاريون مطابقون لهذه المعايير.",
      }}
    />
  );
}
