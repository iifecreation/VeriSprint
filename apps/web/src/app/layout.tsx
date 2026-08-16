import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConditionalTopNav } from "@/components/ConditionalTopNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VeriSprint",
  description: "What actually shipped, backed by commits — not self-reported status.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <ConditionalTopNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
