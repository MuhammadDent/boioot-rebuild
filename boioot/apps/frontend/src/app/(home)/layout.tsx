import Footer from "@/components/ui/Footer";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ flex: 1 }}>{children}</div>
      <Footer />
    </div>
  );
}
