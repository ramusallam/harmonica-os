import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/layout/nav";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  title: "HarmonicaOS",
  description: "Control your computer with harmonica playing — assistive technology powered by real-time pitch detection",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "HarmonicaOS",
    description: "Turn harmonica playing into computer control. Learn mode teaches the patterns; control mode fires the commands.",
    type: "website",
  },
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
        <main className="mx-auto max-w-5xl px-4 py-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
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
