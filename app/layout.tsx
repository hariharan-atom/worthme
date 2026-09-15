import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorthMe — an unnecessarily serious valuation",
  description: "A playful, private, entertainment-only Worth Score.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
