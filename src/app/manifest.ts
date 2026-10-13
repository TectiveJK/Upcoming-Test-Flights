import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Upcoming flights & tests",
    short_name: "Flights & tests",
    description: "A shared board for the flights and tests planned over the next few days.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f0e6",
    theme_color: "#23483c",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
