"use client";

interface ClientDateProps {
  iso: string;
  locale?: string;
}

export default function ClientDate({ iso, locale = "ar-SY" }: ClientDateProps) {
  return <>{new Date(iso).toLocaleDateString(locale)}</>;
}
