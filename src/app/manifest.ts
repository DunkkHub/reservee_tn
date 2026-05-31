import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reservee_TN",
    short_name: "Reservee_TN",
    description: "Book beauty. Feel confident.",
    start_url: "/",
    display: "standalone",
    background_color: "#030303",
    theme_color: "#030303",
    lang: "fr",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
