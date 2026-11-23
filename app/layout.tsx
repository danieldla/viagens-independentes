import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const siteName = "Viagens Independentes";

export const metadata: Metadata = {
  title: { default: siteName, template: `%s | ${siteName}` },
  description: "Guias de viagem independentes, país a país e cidade a cidade.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-white text-stone-900 antialiased">
        <header className="border-b border-stone-200">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              {siteName}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200">
          <div className="mx-auto max-w-4xl px-4 py-6 text-sm text-stone-500">
            © {new Date().getFullYear()} {siteName}
          </div>
        </footer>
      </body>
    </html>
  );
}
