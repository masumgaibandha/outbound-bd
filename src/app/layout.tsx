import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, Poppins } from "next/font/google";

import { RevealOnScroll } from "@/components/public/reveal-on-scroll";
import { publicEnv } from "@/lib/public-env";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

const description =
  "B2B lead generation and cold email outreach, done for you by Outbound BD.";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Outbound BD",
    template: "%s | Outbound BD",
  },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Outbound BD",
    title: "Outbound BD — Cold Email Outreach & B2B Lead Generation",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Outbound BD — Cold Email Outreach & B2B Lead Generation",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        {children}
        <RevealOnScroll />
      </body>
    </html>
  );
}
