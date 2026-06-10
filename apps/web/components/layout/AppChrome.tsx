"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MarketingPopup from "@/components/layout/MarketingPopup";
import { ScrollDirectionProvider } from "@/components/ui/ScrollDirectionProvider";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/dixnissowner");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <ScrollDirectionProvider>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <MarketingPopup />
    </ScrollDirectionProvider>
  );
}
