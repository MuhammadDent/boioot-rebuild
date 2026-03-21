import MainHeader from "@/components/layout/MainHeader";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MainHeader />
      <main>{children}</main>
    </>
  );
}
