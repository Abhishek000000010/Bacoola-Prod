import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import { HttpTypes } from "@medusajs/types"
import { OptionValueIds } from "@lib/util/product-option-filters"
import {
  EMPTY_FILTERS,
  FilterState,
  hasActiveFilters,
} from "@lib/util/product-filters"
import FilteredCategoryProducts from "./FilteredCategoryProducts"

// Import unified architecture components
import LandingRenderer from "@modules/home/components/landing-renderer"
import CategoryProductListing from "./CategoryProductListing"
import SubcategorySlider from "../components/subcategory-slider"

import { getLandingSections } from "@lib/data/landing-pages"
import { listCategories } from "@lib/data/categories"

const EDITORIAL_CATEGORIES = ["women", "men", "kids", "teen", "home"]

export default async function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  optionValueIds,
  filters,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  filters?: FilterState
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const activeFilters = filters ?? EMPTY_FILTERS

  if (!category || !countryCode) notFound()

  // Collect parents
  const parents = [] as HttpTypes.StoreProductCategory[]
  const getParents = (cat: HttpTypes.StoreProductCategory) => {
    if (cat.parent_category) {
      parents.push(cat.parent_category)
      getParents(cat.parent_category)
    }
  }
  getParents(category)

  // Collect category IDs from this category, its descendants, and matching equivalent categories by name.
  //
  // Only scalars + child ids are needed here (rootOf reads parent_category_id;
  // the name-match fallback reads name + category_children ids). The default
  // field set expands each category's parent_category chain into nested objects
  // -- ~600KB for ~490 categories -- and this fetch runs on every category page,
  // so ask for the light set instead.
  const allCategories = await listCategories({
    limit: 500,
    fields: "id,name,handle,parent_category_id,category_children.id",
  }).catch(() => [])

  const targetName = category.name?.toLowerCase().trim()
  const allCategoryIds: string[] = []

  const collectIds = (cat: HttpTypes.StoreProductCategory) => {
    if (cat?.id && !allCategoryIds.includes(cat.id)) {
      allCategoryIds.push(cat.id)
    }
    if (cat?.category_children) {
      cat.category_children.forEach(collectIds)
    }
  }
  collectIds(category)

  // Fallback: match categories elsewhere in the SAME section that share this
  // category's name (e.g. a "T-Shirts" under Clothing and another under Sale),
  // so their products merge into one listing.
  //
  // This MUST stay scoped to the current root section. Section names like
  // "New Now", "Shoes and Accessories" etc. are identical across Women/Men/
  // Teen/Kids, so an unscoped name match pulled every section's products into
  // each section's page (men's products showed up under Women/Teen/Kids New Now).
  const parentIdOf = new Map<string, string | null>()
  for (const c of allCategories as any[]) {
    parentIdOf.set(c.id, c.parent_category_id ?? c.parent_category?.id ?? null)
  }
  const rootOf = (id?: string | null): string | undefined => {
    let current = id ?? undefined
    let guard = 0
    while (current && parentIdOf.get(current) && guard++ < 10) {
      current = parentIdOf.get(current) as string
    }
    return current ?? undefined
  }
  const currentRoot = rootOf(category.id)

  if (targetName && allCategories.length > 0) {
    allCategories.forEach((cat: any) => {
      const catName = cat.name?.toLowerCase().trim()
      if (catName === targetName && rootOf(cat.id) === currentRoot) {
        collectIds(cat)
      }
    })
  }

  // Filtering is per colourway, which the store API cannot express, so it needs
  // the whole category loaded. Only take that cost when a filter is actually
  // set -- an unfiltered page still fetches just the 12 products it shows.
  const productGrid = (
    <Suspense fallback={<SkeletonProductGrid numberOfProducts={category.products?.length ?? 8} />}>
      {hasActiveFilters(activeFilters) ? (
        <FilteredCategoryProducts
          categoryIds={allCategoryIds}
          countryCode={countryCode}
          filters={activeFilters}
          sortBy={sort}
        />
      ) : (
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryId={allCategoryIds}
          countryCode={countryCode}
          optionValueIds={optionValueIds}
        />
      )}
    </Suspense>
  )

  // Render unified Product Listing Page (Page 2 Layout) for all category pages
  return (
    <CategoryProductListing
      // Crumbs only -- passing the categories themselves would drag their whole
      // child/parent subtree into the page (see CategoryCrumb).
      category={{ id: category.id, name: category.name }}
      parents={parents.map((p) => ({
        id: p.id,
        name: p.name,
        handle: p.handle,
      }))}
      categoryIds={allCategoryIds}
      countryCode={countryCode}
      sortBy={sort}
    >
      {productGrid}
    </CategoryProductListing>
  )
}
