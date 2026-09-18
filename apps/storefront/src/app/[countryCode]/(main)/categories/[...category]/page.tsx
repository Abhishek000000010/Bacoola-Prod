import { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  CATEGORY_LINK_FIELDS,
  getCategoryByHandle,
  listCategories,
} from "@lib/data/categories"
import {
  categoryFallbackDescription,
  categorySeoName,
  toMetaDescription,
} from "@lib/util/seo"
import { listRegions } from "@lib/data/regions"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { parseFilterParams } from "@lib/util/product-filters"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: SortOptions
      page?: string
      optionValueIds?: string | string[]
    }
  >
}

// Render category pages on demand instead of prebuilding one per category ×
// country at build time (that blew past Vercel's 45-minute build limit).
// Forced fully dynamic (no ISR) because this page reads `searchParams`
// (sortBy/page/optionValueIds) — mixing that with `revalidate` made Next
// attempt a static shell, hit the dynamic searchParams read mid-render, and
// crash instead of bailing out to dynamic rendering cleanly.
export const dynamic = "force-dynamic"

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    // Same call and fields as the nav, so it's served from that cache.
    const [productCategory, allCategories] = await Promise.all([
      getCategoryByHandle(params.category),
      listCategories({ limit: 1000, fields: CATEGORY_LINK_FIELDS }),
    ])

    const seoName = categorySeoName(productCategory, allCategories)

    return {
      title: seoName,
      description:
        toMetaDescription(productCategory.description) ??
        categoryFallbackDescription(seoName),
      // Was relative ("women-clothing-v2"), which resolved to the wrong URL.
      alternates: {
        canonical: `/${params.countryCode}/categories/${params.category.join("/")}`,
      },
    }
  } catch {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const filters = parseFilterParams(searchParams)

  let productCategory: HttpTypes.StoreProductCategory | undefined

  try {
    productCategory = await getCategoryByHandle(params.category)
  } catch {
    notFound()
  }

  if (!productCategory) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      filters={filters}
    />
  )
}
