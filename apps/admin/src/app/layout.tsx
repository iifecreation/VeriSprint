import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminNav } from "@/components/AdminNav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VeriSprint Operator",
  description: "Internal operator console — cross-tenant workspace, billing, and system-health administration.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <AdminNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
