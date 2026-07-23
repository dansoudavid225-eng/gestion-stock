import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { OfflineProvider } from "@/context/OfflineContext";
import OfflineBar from "@/components/OfflineBar";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Gestion de Stock",
  description: "Application de gestion de stock et ventes pour boutique",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gestion Stock",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="min-h-full bg-gray-50">
        <Script id="register-sw" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`}
        </Script>
        <OfflineProvider>
          <AuthProvider>
            <OfflineBar />
            {children}
          </AuthProvider>
        </OfflineProvider>
      </body>
    </html>
  );
}
