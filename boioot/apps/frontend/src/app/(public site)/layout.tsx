import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
