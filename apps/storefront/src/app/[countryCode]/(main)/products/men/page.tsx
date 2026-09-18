import { Metadata } from "next"
import { notFound } from "next/navigation"
import { categoryFallbackDescription, getDepartment } from "@lib/util/seo"
import { getCategoryByHandle } from "@lib/data/categories"
import CategoryProductListing from "@modules/categories/templates/CategoryProductListing"
import { Suspense } from "react"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"

const department = getDepartment("men")!
const seoName = `All ${department.possessive} Clothing`

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return {
    title: seoName,
    description: categoryFallbackDescription(seoName.replace("All ", "all ")),
    // Same listing as /categories/men; keep one URL in search results.
    alternates: { canonical: `/${countryCode}/categories/men` },
  }
}

type Props = {
  params: Promise<{
    countryCode: string
  }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
    [key: string]: any
  }>
}

export default async function MenProductsPage(props: Props) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const category = await getCategoryByHandle(["men"])

  if (!category) {
    notFound()
  }

  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <CategoryProductListing category={category} parents={[]} countryCode={params.countryCode} sortBy={sort}>
      <Suspense
        fallback={
          <SkeletonProductGrid
            numberOfProducts={category.products?.length ?? 8}
          />
        }
      >
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryId={category.id}
          countryCode={params.countryCode}
          optionValueIds={optionValueIds}
        />
      </Suspense>
    </CategoryProductListing>
  )
}
