import type { Metadata } from "next";
import { AppProvider } from "@/components/app-provider";
import { appMetadata, brand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: {
    default: appMetadata.title,
    template: `%s | ${brand.name}`,
  },
  description: appMetadata.description,
  applicationName: brand.name,
  keywords: ["ENTC placements", "ECE careers", "electronics interview preparation", "GATE", "career roadmap"],
  openGraph: {
    title: appMetadata.title,
    description: appMetadata.description,
    type: "website",
    siteName: brand.name,
    images: [{ url: "/og.png", width: 1776, height: 887, alt: `${brand.name} — From Zero to Job-Ready` }],
  },
  twitter: {
    card: "summary_large_image",
    title: appMetadata.title,
    description: appMetadata.description,
    images: ["/og.png"],
  },
  icons: {
    icon: "/brand-logo.png",
    shortcut: "/brand-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
