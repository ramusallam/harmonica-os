"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", shortLabel: "Home" },
  { href: "/setup", label: "Mic Setup", shortLabel: "Mic" },
  { href: "/select", label: "Harmonica", shortLabel: "Key" },
  { href: "/calibrate", label: "Calibrate", shortLabel: "Cal" },
  { href: "/learn", label: "Learn", shortLabel: "Learn" },
  { href: "/control", label: "Control", shortLabel: "Ctrl" },
  { href: "/settings", label: "Settings", shortLabel: "Set" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-b border-white/10 bg-[var(--bg-secondary)]"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight"
          aria-label="HarmonicaOS home"
        >
          Harmonica<span className="text-[var(--accent)]">OS</span>
        </Link>

        <ul className="flex gap-1" role="list">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
