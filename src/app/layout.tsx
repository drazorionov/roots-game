import type { Metadata, Viewport } from "next";
import "./globals.css";
const description =
  "Create and save Root RPG characters, join campaigns, and track injury, exhaustion, depletion, and gear.";
export const metadata: Metadata = {
  metadataBase: new URL("https://root-helper.vercel.app"),
  title: "Root Helper · Your characters",
  description,
  applicationName: "Root Helper",
  appleWebApp: {
    capable: true,
    title: "Root Helper",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: "Root Helper",
    title: "Root Helper · Your Woodland companion",
    description,
    images: [
      {
        url: "/brand/share-preview.png",
        width: 1200,
        height: 630,
        alt: "Root Helper — a raccoon wanderer with a rust scarf and woodland lettering. Your next Woodland story starts here.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Root Helper · Your Woodland companion",
    description,
    images: [
      {
        url: "/brand/share-preview.png",
        alt: "Root Helper — your unofficial Root RPG companion.",
      },
    ],
  },
};
export const viewport: Viewport = { themeColor: "#344b3b" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
