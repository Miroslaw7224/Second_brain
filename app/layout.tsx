import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Second Brain · Freelancer Edition",
  description: "Jedno miejsce na dokumenty i notatki. Chat z AI po swojej bazie wiedzy — odpowiedzi w sekundach, ze wskazaniem źródła. Dla freelancerów.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <head>
        <meta
          key="coop"
          httpEquiv="Cross-Origin-Opener-Policy"
          content="same-origin-allow-popups"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
