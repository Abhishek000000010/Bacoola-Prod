import { sdk } from "@lib/config"
import { getBaseURL } from "@lib/util/env"
import { MetadataRoute } from "next"

// India is the only storefront region; every URL lives under /in.
const COUNTRY = "in"
const PAGE_SIZE = 200

// Built per request rather than at `next build`, so the build never depends on
// the backend being reachable. The backend fetches below are cached for an
// hour, so Google hitting this doesn't query the catalogue every time.
export const dynamic = "force-dynamic"

const FETCH_CACHE = { revalidate: 3600, tags: ["sitemap"] }

type Entry = MetadataRoute.Sitemap[number]

const STATIC_PAGES: { path: string; priority: number; changeFrequency: Entry["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/landingpage/women", priority: 0.9, changeFrequency: "daily" },
  { path: "/landingpage/men", priority: 0.9, changeFrequency: "daily" },
  { path: "/landingpage/teen", priority: 0.9, changeFrequency: "daily" },
  { path: "/landingpage/kids", priority: 0.9, changeFrequency: "daily" },
  { path: "/store", priority: 0.8, changeFrequency: "daily" },
  { path: "/stores", priority: 0.5, changeFrequency: "monthly" },
  { path: "/help", priority: 0.5, changeFrequency: "monthly" },
  { path: "/returns", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "monthly" },
  { path: "/company", priority: 0.4, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.3, changeFrequency: "monthly" },
  { path: "/press", priority: 0.3, changeFrequency: "monthly" },
  { path: "/responsibility", priority: 0.3, changeFrequency: "monthly" },
  { path: "/ethics", priority: 0.2, changeFrequency: "yearly" },
  { path: "/sitemap", priority: 0.2, changeFrequency: "monthly" },
  { path: "/shipping-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund-and-cancellation-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy-policy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms-and-conditions", priority: 0.2, changeFrequency: "yearly" },
]

type Row = { handle: string; updated_at?: string | Date | null }

/** Pages through a store list endpoint, asking only for handle + updated_at. */
async function fetchAll(
  path: "/store/products" | "/store/product-categories",
  key: "products" | "product_categories"
): Promise<Row[]> {
  const rows: Row[] = []

  for (let offset = 0; ; offset += PAGE_SIZE) {
    // No region_id: with it the store API returns full variants and prices
    // regardless of `fields`.
    const page = await sdk.client.fetch<Record<string, any>>(path, {
      query: { fields: "handle,updated_at", limit: PAGE_SIZE, offset },
      next: FETCH_CACHE,
    })

    const items: Row[] = page[key] ?? []
    rows.push(...items.filter((item) => item.handle))

    if (items.length < PAGE_SIZE || offset + PAGE_SIZE >= (page.count ?? 0)) {
      return rows
    }
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `${getBaseURL()}/${COUNTRY}`
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${base}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  // If the backend is down, still serve the static pages rather than a 500.
  const [categories, products] = await Promise.all([
    fetchAll("/store/product-categories", "product_categories").catch(() => []),
    fetchAll("/store/products", "products").catch(() => []),
  ])

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base}/categories/${category.handle}`,
    lastModified: category.updated_at ? new Date(category.updated_at) : now,
    changeFrequency: "daily",
    priority: 0.7,
  }))

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${base}/products/${product.handle}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }))

  return [...staticEntries, ...categoryEntries, ...productEntries]
}
