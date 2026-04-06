"use client";

import { RoleUsersPage } from "@/features/admin/components/RoleUsersPage";

export default function AdminOwnersPage() {
  return (
    <RoleUsersPage
      config={{
        role: "Owner",
        title: "ملاك العقارات",
        singularLabel: "مالك",
        emptyMessage: "لا يوجد ملاك عقارات مطابقون لهذه المعايير.",
      }}
    />
  );
}
