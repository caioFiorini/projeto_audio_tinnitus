import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "Brisa — conforto sonoro para zumbido",
    description: "Paisagens sonoras suaves, ajustes de ruído, temporizador e diário de percepção para momentos de mais conforto.",
    openGraph: {
      title: "Brisa — conforto sonoro para zumbido",
      description: "Um pouco de calma, um som de cada vez.",
      type: "website",
      locale: "pt_BR",
      images: [{ url: "/og.png", width: 1792, height: 1024, alt: "Brisa, conforto sonoro para zumbido" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Brisa — conforto sonoro para zumbido",
      description: "Um pouco de calma, um som de cada vez.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
