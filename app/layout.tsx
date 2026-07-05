import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aura A&R Research Tool",
  description: "Find and evaluate independent artists for A&R.",
};

const nav = [
  { href: "/", label: "Priority Chart" },
  { href: "/artists", label: "Database" },
  { href: "/artists/new", label: "Add Artist" },
  { href: "/daily-review", label: "Daily Review" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-edge bg-panel/60 backdrop-blur sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
              <Link href="/" className="font-semibold tracking-tight text-lg">
                aura<span className="text-indigo-400">.</span>
                <span className="text-zinc-500 text-sm font-normal ml-2">A&amp;R Research</span>
              </Link>
              <nav className="flex items-center gap-1">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-edge hover:text-white"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
