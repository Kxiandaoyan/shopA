import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home care checkout",
  description: "Multi-tenant home-care storefront for fast checkout",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
