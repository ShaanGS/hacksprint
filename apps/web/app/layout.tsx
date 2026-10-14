import type { Metadata, Viewport } from "next";
import { AppFrame } from "@/components/app/app-frame";
import "./globals.css";

export const metadata: Metadata = {
  title: "App",
  description: "AI manager for a kirana shop",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
