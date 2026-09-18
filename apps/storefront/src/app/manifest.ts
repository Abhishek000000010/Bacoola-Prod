import { MetadataRoute } from "next"

// Android "Add to home screen" and Chrome tab/app icons. The browser-tab
// favicon and the Apple touch icon come from app/favicon.ico, app/icon.png and
// app/apple-icon.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bacoola",
    short_name: "Bacoola",
    description:
      "Timeless essentials and modern luxury fashion for women, men, teens and kids.",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
