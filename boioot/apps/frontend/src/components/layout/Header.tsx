import Link from "next/link";

export default function Header() {
  return (
    <header>
      <div>
        <Link href="/">بيوت</Link>
        <nav>
          <Link href="/">الرئيسية</Link>
          <Link href="/listings">العقارات</Link>
        </nav>
      </div>
    </header>
  );
}
