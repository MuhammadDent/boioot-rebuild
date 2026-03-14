import Link from "next/link";

export default function DashboardSidebar() {
  return (
    <nav>
      <Link href="/dashboard">الرئيسية</Link>
      <Link href="/dashboard/properties">عقاراتي</Link>
      <Link href="/dashboard/projects">مشاريعي</Link>
      <Link href="/dashboard/requests">الطلبات</Link>
      <Link href="/dashboard/messages">الرسائل</Link>
      <Link href="/dashboard/reviews">التقييمات</Link>
      <Link href="/dashboard/settings">الإعدادات</Link>
    </nav>
  );
}
