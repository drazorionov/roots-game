import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Root Helper · Your characters",
  description:
    "Create and save Root RPG characters, join campaigns, and track injury, exhaustion, depletion, and gear.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
