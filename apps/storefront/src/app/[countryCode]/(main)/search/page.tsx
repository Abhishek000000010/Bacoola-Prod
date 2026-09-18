import { Metadata } from "next"
import { Suspense } from "react"

import SearchTemplate from "@modules/search/templates/search-template"
import SearchResultsListing from "@modules/search/templates/search-results-listing"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import FilteredCategoryProducts from "@modules/categories/templates/FilteredCategoryProducts"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"

import { listProducts } from "@lib/data/products"
import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { parseFilterParams, hasActiveFilters } from "@lib/util/product-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { HttpTypes } from "@medusajs/types"

export const metadata: Metadata = {
  title: "Search",
  description: "Search Bacoola for clothing, shoes and accessories for women, men, teens and kids.",
  robots: { index: false, follow: true },
}

// Reads searchParams (q / cat / filters / sort / page), so render on demand.
export const dynamic = "force-dynamic"

type Params = {
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      q?: string
      cat?: string
      sortBy?: SortOptions
      page?: string
    }
  >
  params: Promise<{ countryCode: string }>
}

export default async function SearchPage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const query = searchParams.q
  const cat = typeof searchParams.cat === "string" ? searchParams.cat : undefined
  const countryCode = params?.countryCode || "us"
  const sortBy = searchParams.sortBy
  const pageNumber = searchParams.page ? parseInt(searchParams.page) : 1

  const optionValueIds = parseOptionValueIds(searchParams)
  const activeFilters = parseFilterParams(searchParams)

  // Products for the "You also viewed" strip on the empty-search landing.
  let suggestedProducts: HttpTypes.StoreProduct[] = []
  if (!query) {
    try {
      const { response } = await listProducts({
        countryCode,
        queryParams: { limit: 6 },
        tier: "light",
      })
      suggestedProducts = response.products
    } catch {
      suggestedProducts = []
    }
  }

  // Top-level categories power the search category bar.
  let topCategories: { id: string; name: string; handle: string }[] = []
  if (query) {
    try {
      const all = await listCategories({ limit: 500 })
      topCategories = (all || [])
        .filter((c: HttpTypes.StoreProductCategory) => !c.parent_category)
        .map((c: HttpTypes.StoreProductCategory) => ({
          id: c.id,
          name: c.name,
          handle: c.handle,
        }))
    } catch {
      topCategories = []
    }
  }

  // Resolve the selected category (and its descendants) to scope the results.
  let categoryIds: string[] = []
  if (query && cat) {
    try {
      const category = await getCategoryByHandle([cat])
      const collect = (c?: HttpTypes.StoreProductCategory) => {
        if (!c) return
        if (c.id && !categoryIds.includes(c.id)) categoryIds.push(c.id)
        c.category_children?.forEach(collect)
      }
      collect(category)
    } catch {
      categoryIds = []
    }
  }

  const productGrid = hasActiveFilters(activeFilters) ? (
    <FilteredCategoryProducts
      categoryIds={categoryIds}
      countryCode={countryCode}
      filters={activeFilters}
      sortBy={sortBy}
      q={query}
    />
  ) : (
    <PaginatedProducts
      sortBy={sortBy}
      page={pageNumber}
      categoryId={categoryIds.length ? categoryIds : undefined}
      countryCode={countryCode}
      optionValueIds={optionValueIds}
      q={query}
    />
  )

  return (
    <SearchTemplate
      countryCode={countryCode}
      query={query}
      suggestedProducts={suggestedProducts}
    >
      {query && (
        <SearchResultsListing
          countryCode={countryCode}
          query={query}
          categories={topCategories}
          activeHandle={cat}
          categoryIds={categoryIds}
          sortBy={sortBy || "created_at"}
        >
          <Suspense fallback={<SkeletonProductGrid />}>{productGrid}</Suspense>
        </SearchResultsListing>
      )}
    </SearchTemplate>
  )
}
