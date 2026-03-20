import type { Metadata } from "next";
import { Nav } from "@/components/layout/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "HarmonicaOS",
  description: "Control your computer with harmonica playing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        {/* Screen reader announcer — hidden, used by a11y helpers */}
        <div
          id="sr-announcer"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />
      </body>
    </html>
  );
}
