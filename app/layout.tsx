import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7faf8",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    applicationName: "Brisa",
    title: "Brisa — conforto sonoro para zumbido",
    description: "Paisagens sonoras suaves, ajustes de ruído, temporizador e diário de percepção para momentos de mais conforto.",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Brisa",
    },
    icons: {
      icon: [{ url: "/app-icon.png", type: "image/png", sizes: "512x512" }],
      apple: [{ url: "/app-icon.png", type: "image/png", sizes: "512x512" }],
    },
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
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
