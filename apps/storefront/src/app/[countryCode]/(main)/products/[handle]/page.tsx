import { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getResolvedLook } from "@lib/data/look"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { SITE_NAME, toMetaDescription } from "@lib/util/seo"
import CustomProductDetails from "@modules/products/templates/CustomProductDetails"
import RecommendedProducts from "@modules/products/components/recommended-products"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

// Render product pages on demand instead of prebuilding the whole catalog at
// build time (prerendering every product blew past Vercel's 45-minute build
// limit). Forced fully dynamic (no ISR) because this page reads `searchParams`
// (`v_id`) — mixing that with `revalidate` made Next attempt a static shell,
// hit the dynamic searchParams read mid-render, and crash instead of bailing
// out to dynamic rendering cleanly.
export const dynamic = "force-dynamic"

export async function generateStaticParams() {
  return []
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
    tier: "light",
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  const description =
    toMetaDescription(product.description) ??
    `Shop ${product.title} at ${SITE_NAME}. Choose your size and colour and order online with delivery across India.`

  return {
    title: product.title,
    description,
    // `?v_id=` variant links render the same product; point them all at one URL.
    alternates: {
      canonical: `/${params.countryCode}/products/${handle}`,
    },
    // openGraph replaces the root layout's object wholesale and the title
    // template doesn't reach it, so the brand is spelled out here.
    openGraph: {
      title: `${product.title} | ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_IN",
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const [region, pricedProduct] = await Promise.all([
    getRegion(params.countryCode),
    listProducts({
      countryCode: params.countryCode,
      queryParams: { handle: params.handle },
      tier: "full",
    }).then(({ response }) => response.products[0]),
  ])

  const searchParams = await props.searchParams
  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)
  // Only products with a curated look pay for this; the rest return null
  // without a request.
  const look = await getResolvedLook(pricedProduct, params.countryCode)

  return (
    <Suspense fallback={null}>
      <CustomProductDetails
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images ?? []}
        look={look}
      />
      <Suspense fallback={null}>
        <RecommendedProducts
          product={pricedProduct}
          region={region}
          countryCode={params.countryCode}
          selectedVariantId={selectedVariantId}
        />
      </Suspense>
    </Suspense>
  )
}
