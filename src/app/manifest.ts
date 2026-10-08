import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Root Helper",
    short_name: "Root Helper",
    description:
      "Your unofficial Root RPG companion for characters and campaigns.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eee5cd",
    theme_color: "#344b3b",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
