import { retrieveCartWithInventory } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import CartTemplate from "@modules/cart/templates"
import { listProducts, getRecommendedProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
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

  if (!cart) {
    return notFound()
  }

  const shippingOptions = await listCartShippingMethods(cart.id).catch(() => null)

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
