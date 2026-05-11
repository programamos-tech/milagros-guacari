import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist_Mono, Montserrat } from "next/font/google";
import { storeBrand, storeShortDescription } from "@/lib/brand";
import { ADMIN_SIDEBAR_BG, STORE_CHROME_BG } from "@/lib/admin-theme";
import { STORE_ACCENT, STORE_ACCENT_HOVER } from "@/lib/store-theme";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: storeBrand,
  description: storeShortDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="flex min-h-full flex-col bg-white text-stone-800"
        style={
          {
            "--admin-sidebar-bg": ADMIN_SIDEBAR_BG,
            "--store-chrome-bg": STORE_CHROME_BG,
            "--store-accent": STORE_ACCENT,
            "--store-accent-hover": STORE_ACCENT_HOVER,
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
