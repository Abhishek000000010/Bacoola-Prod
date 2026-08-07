"use server"

import { sdk } from "@lib/config"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"
import { ProductCard, toProductCards } from "@lib/util/product-cards"
import { cache } from "react"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

const PRODUCT_FETCH_TIERS = {
  light: "id,title,description,thumbnail,handle",
  // Listing tier. Variant titles/options/metadata are needed to split each
  // product into one card per colourway; without them every card falls back to
  // the bare product title. Kept to these fields rather than `*variants` so the
  // payload stays close to what it was.
  medium:
    "id,title,handle,thumbnail,*images,*variants.calculated_price,*options,*options.values,variants.title,*variants.options,variants.metadata",
  // `variants.metadata` carries the admin-curated per-colour image list
  // (`metadata.image_order`) the product gallery reads -- without it the page
  // can't tell which images belong to the selected colourway.
  full: "*images,*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+variants.metadata,+metadata,+tags,",
  // Just what the filter facets need: colour/size options and price. Skips the
  // heavy *images and variants.metadata the grid needs but facets do not, so the
  // FILTER AND ORDER drawer's data loads in a fraction of the payload.
  facet:
    "id,title,handle,*options,variants.title,*variants.options,*variants.calculated_price",
}

type FetchTier = keyof typeof PRODUCT_FETCH_TIERS;

// Sorts the store API can't express, so they're applied after fetching.
const PRICE_SORTS: SortOptions[] = ["price_asc", "price_desc"]

// How many products to pull per request when a price sort forces us to load
// the full result set, and the ceiling on how much of it we'll load.
const PRICE_SORT_PAGE_SIZE = 100
const MAX_PRICE_SORT_PRODUCTS = 1000

export const listProducts = cache(async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
  tier = "full",
}: {
  pageParam?: number
  queryParams?: ProductListQueryParams
  countryCode?: string
  regionId?: string
  tier?: FetchTier
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  // Cache product fetches in Next's Data Cache. `force-dynamic` routes (product
  // detail, search) otherwise refetch on every view, and the priced "full" tier
  // is slow to compute. A short revalidate keeps prices/stock fresh enough while
  // making repeat and back-navigation views near-instant; tag-based invalidation
  // still busts the cache immediately when a product is updated in admin.
  const next = {
    ...(await getCacheOptions("products")),
    revalidate: 300,
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields: PRODUCT_FETCH_TIERS[tier],
          ...queryParams,
        },
        headers,
        next,
      }
    )
    .then(({ products, count }: any) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
})

/**
 * Gets one product by ID, with full pricing and variants.
 */
export const retrievePricedProductById = cache(async ({
  id,
  regionId,
}: {
  id: string
  regionId: string
}) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  // Without a revalidate this fetch is cached indefinitely and only busts on a
  // matching revalidateTag -- which nothing fires on an admin product edit -- so
  // a price/stock change never reached the detail page (the cart reprices live,
  // which is why it looked correct there). Mirror the listing's short window so
  // edits show up within a few minutes.
  const next = {
    ...(await getCacheOptions(["products", id].join("-"))),
    revalidate: 300,
  }

  return sdk.client
    .fetch<{ product: HttpTypes.StoreProduct }>(`/store/products/${id}`, {
      method: "GET",
      query: {
        region_id: regionId,
        fields: PRODUCT_FETCH_TIERS.full,
      },
      headers,
      next,
    })
    .then(({ product }: { product: HttpTypes.StoreProduct }) => product)
})

/**
 * This will fetch products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = cache(async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  optionValueIds,
  tier = "medium",
}: {
  page?: number
  queryParams?: ProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
  tier?: FetchTier
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const _page = Math.max(page, 1)
  const optionFilters = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )

  const baseQuery = {
    ...queryParams,
    ...(optionFilters.length ? { option_value_id: optionFilters } : {}),
  }

  // "Latest arrivals" maps onto a backend order, so the store API can do the
  // sorting and the pagination for us and we only fetch the page being shown.
  //
  // Ordering by -id rather than -created_at: bulk-imported products share an
  // identical created_at, which makes that ordering unstable, so offset paging
  // returns duplicates on one page and drops products entirely from another.
  // Product ids are ULIDs whose prefix encodes creation time, so -id gives the
  // same newest-first order with unique, deterministic tie-breaking. The store
  // API rejects multi-field ordering, so a secondary sort key isn't an option.
  if (!PRICE_SORTS.includes(sortBy)) {
    const {
      response: { products, count },
    } = await listProducts({
      pageParam: _page,
      queryParams: { ...baseQuery, limit, order: "-id" },
      countryCode,
      tier,
    })

    return {
      response: { products, count },
      nextPage: count > _page * limit ? _page + 1 : null,
      queryParams,
    }
  }

  // The store API can't order by calculated_price, so price sorts have to be
  // applied across the whole result set before it can be sliced into pages.
  // Page one is fetched first to learn the real total, then the remaining
  // pages are fetched in parallel rather than in a waterfall. The stable -id
  // order matters here too: these offset pages get concatenated, so an
  // unstable order would duplicate and drop products before sorting.
  const first = await listProducts({
    pageParam: 1,
    queryParams: { ...baseQuery, limit: PRICE_SORT_PAGE_SIZE, order: "-id" },
    countryCode,
    tier,
  })

  const count = first.response.count
  let allProducts = first.response.products

  const fetchTotal = Math.min(count, MAX_PRICE_SORT_PRODUCTS)

  if (fetchTotal > PRICE_SORT_PAGE_SIZE) {
    const remainingPages: number[] = []
    for (
      let p = 2;
      p <= Math.ceil(fetchTotal / PRICE_SORT_PAGE_SIZE);
      p++
    ) {
      remainingPages.push(p)
    }

    const rest = await Promise.all(
      remainingPages.map((p) =>
        listProducts({
          pageParam: p,
          queryParams: { ...baseQuery, limit: PRICE_SORT_PAGE_SIZE, order: "-id" },
          countryCode,
          tier,
        })
      )
    )

    allProducts = allProducts.concat(
      ...rest.map((r) => r.response.products)
    )
  }

  const sortedProducts = sortProducts(allProducts, sortBy)

  const offset = (_page - 1) * limit
  const paginatedProducts = sortedProducts.slice(offset, offset + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage: count > _page * limit ? _page + 1 : null,
    queryParams,
  }
})

/**
 * High-level product fetch for the infinite-scroll listing grid.
 *
 * Mirrors the query PaginatedProducts builds, but takes plain serialisable
 * arguments and returns plain serialisable data, so it can be called straight
 * from the client as a server action while the shopper scrolls. `nextPage` is
 * null once there is nothing left to load.
 */
export async function loadStoreProducts({
  page,
  sortBy = "created_at",
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  q,
}: {
  page: number
  sortBy?: SortOptions
  collectionId?: string
  categoryId?: string | string[]
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  q?: string
}): Promise<{ cards: ProductCard[]; nextPage: number | null }> {
  const queryParams: ProductListQueryParams & { q?: string } = { limit: 12 }

  if (q) queryParams.q = q
  if (collectionId) queryParams.collection_id = [collectionId]
  if (categoryId) {
    queryParams.category_id = Array.isArray(categoryId) ? categoryId : [categoryId]
  }
  if (productsIds) queryParams.id = productsIds
  if (sortBy === "created_at") queryParams.order = "created_at"

  const {
    response: { products },
    nextPage,
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
    tier: "medium",
  })

  // Split into colourway tiles here rather than in the browser: the raw variant
  // list is the bulk of the payload, and this way it never crosses the wire.
  return { cards: toProductCards(products), nextPage }
}

// A category opts into sale pricing by carrying metadata.sale_percent (0<n<100),
// and that applies to its whole subtree -- the same rule the backend uses.
const parseSalePercent = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number(value) : value
  if (typeof n !== "number" || !Number.isFinite(n)) return null
  if (n <= 0 || n >= 100) return null
  return n
}

// A category is "sale" when it or any ancestor declares sale_percent.
const isSaleCategory = (category: any): boolean => {
  let c = category
  let guard = 0
  while (c && guard++ < 6) {
    if (parseSalePercent(c.metadata?.sale_percent) !== null) return true
    c = c.parent_category
  }
  return false
}

const cheapestAmount = (product: any): number | null => {
  const amounts = (product?.variants ?? [])
    .map((v: any) => v?.calculated_price?.calculated_amount)
    .filter((a: any) => typeof a === "number" && Number.isFinite(a)) as number[]
  return amounts.length ? Math.min(...amounts) : null
}

const variantAmount = (product: any, variantId: string): number | null => {
  const variant = product?.variants?.find((v: any) => v.id === variantId)
  const amount = variant?.calculated_price?.calculated_amount
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null
}

const closestAmount = (product: any, targetAmount: number): number | null => {
  const amounts = (product?.variants ?? [])
    .map((v: any) => v?.calculated_price?.calculated_amount)
    .filter((a: any) => typeof a === "number" && Number.isFinite(a)) as number[]
  if (!amounts.length) return null
  return amounts.reduce((closest: number, current: number) => 
    Math.abs(current - targetAmount) < Math.abs(closest - targetAmount) ? current : closest
  )
}

/**
 * Recommends products for the product detail page.
 *
 * Products from the SAME main (non-sale) category, ranked so the ones closest in
 * price to the product being viewed come first -- a shirt at 1000 recommends
 * other shirts near 1000 before ones at 5000. The single-sub-category rule
 * enforced in the admin means "the main category" is unambiguous. Sale category
 * membership is ignored, and the product itself is excluded.
 */
export const getRecommendedProducts = cache(async ({
  product,
  countryCode,
  limit = 10,
  selectedVariantId,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
  limit?: number
  selectedVariantId?: string
}): Promise<HttpTypes.StoreProduct[]> => {
  const region = await getRegion(countryCode)
  if (!region) return []

  // The product coming from the page's full tier doesn't carry categories, so
  // fetch them (with enough ancestor metadata to tell sale categories apart).
  let categories: any[] = (product as any).categories ?? []
  if (!categories.length) {
    try {
      const { product: withCats } = await sdk.client.fetch<{ product: any }>(
        `/store/products/${product.id}`,
        {
          method: "GET",
          query: {
            region_id: region.id,
            fields:
              "id,categories.id,categories.metadata," +
              "categories.parent_category.metadata," +
              "categories.parent_category.parent_category.metadata",
          },
          headers: { ...(await getAuthHeaders()) },
          next: { ...(await getCacheOptions("products")) },
        }
      )
      categories = withCats?.categories ?? []
    } catch {
      return []
    }
  }

  const mainCategory = categories.find((c) => c?.id && !isSaleCategory(c))
  if (!mainCategory?.id) return []

  const refPrice = (selectedVariantId ? variantAmount(product, selectedVariantId) : null) ?? cheapestAmount(product)

  // Pull a slice of the category so the price-closeness ranking has something to
  // work with, then rank locally (the store API can't order by calculated
  // price). Kept modest — a larger pool multiplies the payload for a strip that
  // only shows `limit` cards.
  //
  // Do NOT shrink this pool to save bytes — it backfires. Only `limit` products
  // are ever serialised into the page, so the pool size does not land in the
  // HTML directly; what it changes is WHICH products win. Narrowing 4x -> 2x
  // measurably grew the rendered page (1.36MB -> 2.23MB, 0.6s -> 1.0s) because
  // the poorer price matches it was forced to settle for happened to be
  // image-heavy multi-colourway products: 124 distinct images instead of 80.
  const { response } = await listProducts({
    countryCode,
    tier: "medium",
    queryParams: { category_id: [mainCategory.id], limit: Math.max(limit * 4, 24) } as any,
  })

  const scored = response.products
    .filter((p) => p.id !== product.id)
    .map((p) => ({ p, price: refPrice != null ? closestAmount(p, refPrice) : cheapestAmount(p) }))

  scored.sort((a, b) => {
    if (refPrice == null) return 0
    const da = a.price == null ? Number.MAX_SAFE_INTEGER : Math.abs(a.price - refPrice)
    const db = b.price == null ? Number.MAX_SAFE_INTEGER : Math.abs(b.price - refPrice)
    return da - db
  })

  // Re-order variants within each product so that the variant closest to refPrice
  // comes first. This ensures `getVariantCards` generates the best matching colorway first.
  if (refPrice != null) {
    scored.forEach((x) => {
      if (x.p.variants && x.p.variants.length > 0) {
        x.p.variants.sort((va: any, vb: any) => {
          const priceA = va?.calculated_price?.calculated_amount ?? Number.MAX_SAFE_INTEGER
          const priceB = vb?.calculated_price?.calculated_amount ?? Number.MAX_SAFE_INTEGER
          return Math.abs(priceA - refPrice) - Math.abs(priceB - refPrice)
        })
      }
    })
  }

  return scored.slice(0, limit).map((x) => x.p)
})
