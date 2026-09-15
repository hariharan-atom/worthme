import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorthMe — an unnecessarily serious valuation",
  description: "A playful, private, entertainment-only Worth Score.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}