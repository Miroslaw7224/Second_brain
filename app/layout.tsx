import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Second Brain app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Cross-Origin-Opener-Policy"
          content="same-origin-allow-popups"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
