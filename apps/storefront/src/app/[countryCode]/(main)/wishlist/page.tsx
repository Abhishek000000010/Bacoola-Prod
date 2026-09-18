import { NO_INDEX } from "@lib/util/seo"
import { Metadata } from "next"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import ProductPreview from "@modules/products/components/product-preview"
import { notFound } from "next/navigation"

import WishlistClient from "@modules/wishlist/components/wishlist-client"

export const metadata: Metadata = {
  title: "Wishlist",
  description: "View and manage the items you've saved to your Bacoola wishlist.",
  robots: NO_INDEX,
}

export default async function WishlistPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params

  const region = await getRegion(countryCode)

  if (!region) {
    notFound()
  }

  // Fetch a few products for the "Popular Right Now" section
  const {
    response: { products: popularProducts },
  } = await listProducts({
    regionId: region.id,
    tier: "medium",
    queryParams: {
      limit: 4,
    },
  })

  return (
    <WishlistClient region={region} popularProducts={popularProducts || []} />
  )
}
