import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brisa — conforto sonoro",
    short_name: "Brisa",
    description: "Paisagens sonoras suaves e diário de percepção para momentos de mais conforto.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7faf8",
    theme_color: "#f7faf8",
    categories: ["health", "lifestyle"],
    lang: "pt-BR",
    icons: [
      {
        src: "/app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
