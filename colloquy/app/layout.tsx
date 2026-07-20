import type { Metadata } from "next";
import "./globals.css";
import { Disclaimer } from "../components/Disclaimer";

export const metadata: Metadata = {
  title: "The Colloquy",
  description:
    "A multi-agent debate engine: AI personas of documented theologians argue a question toward a scripture-grounded majority.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        <div className="mx-auto flex min-h-dvh w-full max-w-chamber flex-col px-4 sm:px-6">
          <header className="border-b border-chamber-line py-6">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-chamber-gold">
              In session
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              The Colloquy
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-chamber-muted">
              Five simulated theologians analyze a question independently, then
              debate in rounds until a scripture-grounded majority forms — or the
              rounds run out.
            </p>
          </header>
          <main className="flex-1 py-6">{children}</main>
          <Disclaimer />
        </div>
      </body>
    </html>
  );
}
