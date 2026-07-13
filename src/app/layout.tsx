import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "@/config/brand";
import Footer from "@/components/Footer";
import favicon16 from "../../brand/longshot-favicon-16.png";
import favicon32 from "../../brand/longshot-favicon-32.png";
import icon512 from "../../brand/longshot-icon-512.png";
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
  title: `${BRAND.name} — Polymarket performance tracker`,
  description: `${BRAND.tagline} Open source, no login required.`,
  icons: {
    icon: [
      { url: favicon16.src, sizes: "16x16", type: "image/png" },
      { url: favicon32.src, sizes: "32x32", type: "image/png" },
      { url: icon512.src, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: icon512.src }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Footer />
      </body>
    </html>
  );
}
