import "./../styles/globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Nova Stream",
  description: "SaaS IPTV player connected to your Xtream account",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body>
        <header className="sticky top-0 z-50 backdrop-blur bg-black/40 border-b border-zinc-900">
          <div className="container flex items-center justify-between h-14">
            <Link href="/" className="font-bold text-xl">Nova <span className="text-brand">Stream</span></Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/movies">Films</Link>
              <Link href="/series">Séries</Link>
              <Link href="/live">TV en direct</Link>
              <Link href="/my-list">Ma liste</Link>
              <Link href="/settings">Paramètres</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-zinc-900 mt-16">
          <div className="container py-10 text-sm text-zinc-400">
            © {new Date().getFullYear()} Nova Stream — MVP
          </div>
        </footer>
      </body>
    </html>
  );
}
