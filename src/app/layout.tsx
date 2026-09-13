import type { Metadata, Viewport } from "next";
import { Comic_Neue, JetBrains_Mono } from "next/font/google";

import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const comicNeue = Comic_Neue({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

const comicNeueHeading = Comic_Neue({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Kavin Illam",
  title: {
    default: "Kavin Illam",
    template: "%s · Kavin Illam",
  },
  description:
    "Private multi-project construction management, finance, and document portal.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kavin Illam",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#063F3A" },
    { media: "(prefers-color-scheme: dark)", color: "#063F3A" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${comicNeue.variable} ${comicNeueHeading.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full font-sans text-[15px] leading-relaxed tracking-[-0.01em]">
        {children}
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
