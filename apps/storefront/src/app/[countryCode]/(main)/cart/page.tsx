import { NO_INDEX } from "@lib/util/seo"
import { retrieveCartWithInventory } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import CartTemplate from "@modules/cart/templates"
import { listProducts, getRecommendedProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shopping Bag",
  description: "Review the items in your Bacoola shopping bag and continue to checkout.",
  robots: NO_INDEX,
}

export default async function Cart(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params;
  const { countryCode } = params;
  const [cart, customer, region] = await Promise.all([
    retrieveCartWithInventory().catch((error) => {
      console.error(error)
      return null
    }),
    retrieveCustomer(),
    getRegion(countryCode)
  ])

  // A missing or stale cart cookie (cleared cookies, an expired/deleted cart)
  // should render as an empty bag, not a 404. A real cart only gets created
  // once the shopper adds something -- writing a fresh cart cookie here isn't
  // possible anyway, since cookies can't be set during a page render.
  const shippingOptions = cart
    ? await listCartShippingMethods(cart.id).catch(() => null)
    : null

  let recommendedProducts: any[] = []
  if (cart?.items?.length) {
    const handle = cart.items[0].product_handle
    if (handle) {
      const { response } = await listProducts({
        queryParams: { handle },
        ...(region?.id ? { regionId: region.id } : { countryCode }),
        tier: "full"
      }).catch(() => ({ response: { products: [] } }))

      const productObj = response.products?.[0]
      if (productObj) {
        recommendedProducts = await getRecommendedProducts({
          product: productObj,
          countryCode,
          limit: 10,
        }).catch(() => [])
      }
    }
  } else {
    const { response } = await listProducts({
      queryParams: { limit: 10, order: "-id" } as any,
      ...(region?.id ? { regionId: region.id } : { countryCode }),
      tier: "full"
    }).catch(() => ({ response: { products: [] } }))
    recommendedProducts = response.products ?? []
  }

  return (
    <CartTemplate
      cart={cart}
      customer={customer}
      shippingOptions={shippingOptions ?? []}
      recommendedProducts={recommendedProducts}
      region={region!}
    />
  )
}
