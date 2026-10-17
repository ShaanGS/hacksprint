import type { Metadata, Viewport } from "next";
import {
  Noto_Sans_Devanagari,
  Noto_Sans_Kannada,
  Noto_Sans_Tamil,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { colors } from "@design/tokens";
import { cn } from "@/lib/cn";
import { previewShop } from "@/lib/preview/data";
import "./globals.css";

// Plus Jakarta Sans for English and every number. The Noto fonts carry only their own script, so
// a phone downloads Tamil, Hindi or Kannada letters only when that language is on screen.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
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
  description:
    "Where a kirana's money is, whether this week's bills are covered, who to collect from, and the papers for a bank loan.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: colors.canvas,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(jakarta.variable, tamil.variable, devanagari.variable, kannada.variable)}
    >
      <body>{children}</body>
    </html>
  );
}
