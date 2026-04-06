"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * الوسطاء (Brokers) هم مستخدمون بدور Broker — وليسوا كياناً مستقلاً.
 * هذه الصفحة تُعيد التوجيه تلقائياً إلى دليل المستخدمين مُصفّاً بدور Broker.
 */
export default function AdminBrokersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/admin/users?role=Broker");
  }, [router]);
  return null;
}
