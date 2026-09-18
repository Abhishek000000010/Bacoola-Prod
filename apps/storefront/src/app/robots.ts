import { getBaseURL } from "@lib/util/env"
import { MetadataRoute } from "next"

// Mirrors the pages marked `noindex` in their metadata (see lib/util/seo.ts):
// robots.txt stops the crawl, the noindex tag covers links found elsewhere.
const PRIVATE_PATHS = [
  "/in/cart",
  "/in/checkout",
  "/in/account",
  "/in/wishlist",
  "/in/order",
  "/in/verify-account",
  "/in/search",
  "/in/newsletter",
  "/api/",
  "/field-parity",
]

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseURL()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
