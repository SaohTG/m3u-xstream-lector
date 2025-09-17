export const metadata = { title: 'NovaStream', description: 'IPTV M3U & Xtream viewer' };
import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-10 backdrop-blur bg-black/30 border-b border-white/10">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex gap-4">
            <Link href="/" className="font-bold">NovaStream</Link>
            <Link href="/tv">TV</Link>
            <Link href="/movies">Films</Link>
            <Link href="/series">Séries</Link>
            <Link href="/settings" className="ml-auto">Paramètres</Link>
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
