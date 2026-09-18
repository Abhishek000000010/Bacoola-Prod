import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { SITE_NAME, toMetaDescription } from "@lib/util/seo"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      page?: string
      sortBy?: SortOptions
      optionValueIds?: string | string[]
    }
  >
}

export const PRODUCT_LIMIT = 12

// Render collection pages on demand instead of prebuilding one per collection ×
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
  let collection: StoreCollection | undefined

  try {
    collection = await getCollectionByHandle(params.handle)
  } catch {
    notFound()
  }

  if (!collection) {
    notFound()
  }

  return {
    title: `${collection.title} Collection`,
    description:
      toMetaDescription(collection.metadata?.description as string | undefined) ??
      `Shop the ${collection.title} collection at ${SITE_NAME}. Discover new styles and everyday essentials, with delivery across India.`,
    alternates: {
      canonical: `/${params.countryCode}/collections/${params.handle}`,
    },
  }
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  let collection: StoreCollection | undefined

  try {
    collection = await getCollectionByHandle(params.handle)
  } catch {
    notFound()
  }

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
    />
  )
}
