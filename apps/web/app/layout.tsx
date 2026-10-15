import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_Devanagari, Noto_Sans_Kannada, Noto_Sans_Tamil } from "next/font/google";
import { colors } from "@design/tokens";
import { AppFrame } from "@/components/app/app-frame";
import { cn } from "@/lib/cn";
import { previewShop } from "@/lib/preview/data";
import "./globals.css";

// Geist for English and every number. The Noto fonts carry only their own script, so a phone
// downloads Tamil, Hindi or Kannada letters only when that language is on screen.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", preload: false });
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  preload: false,
});
const kannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  variable: "--font-kannada",
  preload: false,
});

export const metadata: Metadata = {
  title: previewShop.name,
  description: "Order by voice from your kirana, in your language",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: colors.surface,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(geist.variable, tamil.variable, devanagari.variable, kannada.variable)}
    >
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
