import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Root Helper · Your woodland, together",
  description:
    "A cozy companion for Root: The Roleplaying Game. Gather your party, create vagabonds, and keep your character sheets close.",
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
