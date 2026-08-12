"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { cache } from "react"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { getLocale } from "./locale-actions"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 *
 * Memoised for the duration of one render. The cart is `no-store`, so before
 * this every caller in a single page render paid its own round trip -- and the
 * `(main)` layout and the nav's CartButton both call it on EVERY page, which
 * doubled the cost of the one request no page can skip.
 *
 * Does NOT fill in `variant.inventory_quantity`; that needs a second request
 * and only the cart/checkout item rows read it. Use `retrieveCartWithInventory`
 * there instead of paying for it site-wide.
 */
export const retrieveCart = cache(async function retrieveCart(
  cartId?: string,
  fields?: string
) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name"

  if (!id) {
    return null
  }

  const [authHeaders, cacheOpts] = await Promise.all([
    getAuthHeaders(),
    getCacheOptions("carts"),
  ])

  const headers = { ...authHeaders }
  const next = { ...cacheOpts }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "no-store",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
})

/**
 * The cart with real stock numbers on each line item, for the pages that show
 * them (cart, checkout). Enriches the memoised cart in place, so callers of
 * `retrieveCart` in the same render see the numbers too without a second fetch.
 */
export const retrieveCartWithInventory = cache(
  async function retrieveCartWithInventory() {
    const cart = await retrieveCart()

    if (!cart) {
      return cart
    }

    return await withVariantInventory(cart, { ...(await getAuthHeaders()) })
  }
)

/**
 * Fills in `variant.inventory_quantity` on every line item.
 *
 * The cart endpoint never returns it: `inventory_quantity` is computed from the
 * linked inventory items and is only served by /store/products, so asking for
 * it via `fields` on a cart silently yields undefined no matter how it is
 * spelled. Anything reading stock off the cart therefore fell back to a
 * hardcoded default and let customers order more than exists.
 *
 * One extra request covers the whole cart, keeping the real number in the same
 * place every caller already looks.
 */
async function withVariantInventory(
  cart: HttpTypes.StoreCart,
  headers: Record<string, any>
): Promise<HttpTypes.StoreCart> {
  const productIds = [
    ...new Set(
      (cart.items ?? [])
        .map((item: any) => item.variant?.product_id)
        .filter(Boolean)
    ),
  ]

  if (!productIds.length) {
    return cart
  }

  const stockByVariant = new Map<string, number>()

  try {
    const res = await sdk.client.fetch<any>(`/store/products`, {
      method: "GET",
      query: {
        id: productIds,
        fields: "id,*variants,*variants.inventory_quantity",
        limit: productIds.length,
      },
      headers,
      cache: "no-store",
    })

    for (const product of res?.products ?? []) {
      for (const variant of product?.variants ?? []) {
        if (typeof variant?.inventory_quantity === "number") {
          stockByVariant.set(variant.id, variant.inventory_quantity)
        }
      }
    }
  } catch {
    // Stock stays unknown rather than wrong; callers keep their own guard and
    // the server-side check at place-order still blocks an oversell.
    return cart
  }

  for (const item of cart.items ?? []) {
    const variant: any = item.variant
    if (variant && stockByVariant.has(variant.id)) {
      variant.inventory_quantity = stockByVariant.get(variant.id)
    }
  }

  return cart
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart: any = await retrieveCart(undefined, "id,region_id,completed_at")

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (cart?.completed_at) {
    await removeCartId()
    cart = null
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      const [cartCacheTag, fulfillmentCacheTag] = await Promise.all([
        getCacheTag("carts"),
        getCacheTag("fulfillment"),
      ])
      revalidateTag(cartCacheTag)
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}



export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const data = {
      shipping_address: {
        first_name: formData.get("shipping_address.first_name"),
        last_name: formData.get("shipping_address.last_name"),
        address_1: formData.get("shipping_address.address_1"),
        address_2: "",
        company: formData.get("shipping_address.company"),
        postal_code: formData.get("shipping_address.postal_code"),
        city: formData.get("shipping_address.city"),
        country_code: formData.get("shipping_address.country_code"),
        province: formData.get("shipping_address.province"),
        phone: normalizePhone(formData.get("shipping_address.phone")),
      },
      email: formData.get("email"),
    } as any

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = data.shipping_address

    if (sameAsBilling !== "on")
      data.billing_address = {
        first_name: formData.get("billing_address.first_name"),
        last_name: formData.get("billing_address.last_name"),
        address_1: formData.get("billing_address.address_1"),
        address_2: "",
        company: formData.get("billing_address.company"),
        postal_code: formData.get("billing_address.postal_code"),
        city: formData.get("billing_address.city"),
        country_code: formData.get("billing_address.country_code"),
        province: formData.get("billing_address.province"),
        phone: normalizePhone(formData.get("billing_address.phone")),
      }
    await updateCart(data)

    // A delivery method must be chosen before payment. It is set by a separate
    // request when the shopper picks a radio, so guard here rather than trust
    // the client -- otherwise submitting the address alone slips through to
    // payment with no shipping method (and Shiprocket has nothing to fulfil).
    const cart = await retrieveCart()
    if (!cart?.shipping_methods?.length) {
      return "Please select a delivery method before continuing to payment."
    }
  } catch (e: any) {
    return e.message
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=payment`
  )
}

/**
 * Shiprocket expects a bare 10-digit Indian mobile number. Browser autofill on
 * the "tel" field often supplies the full "+91XXXXXXXXXX" (the visible +91 in
 * the UI is only decorative), which would otherwise reach the order as 12+
 * digits with a "+". Strip everything but digits and keep the last 10 so the
 * stored phone is always what Shiprocket accepts.
 */
function normalizePhone(value: FormDataEntryValue | null): string {
  const digits = (value?.toString() ?? "").replace(/\D/g, "")
  return digits.length > 10 ? digits.slice(-10) : digits
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase()

    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag)

    removeCartId()
    redirect(`/${countryCode}/order/${cartRes?.order.id}/confirmed`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}

/**
 * Checks the real-time inventory of all items in the cart to prevent overselling.
 * Must bypass cache to get the absolute latest stock.
 */
export async function checkCartInventory(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartResp = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields: "*items, *items.variant, *items.variant.inventory_quantity",
      },
      headers,
      cache: "no-store", // CRITICAL: Skip Next.js cache for real-time check
    })
    .catch(() => null)

  if (!cartResp?.cart) {
    throw new Error("Could not fetch cart for inventory check")
  }

  const cart = cartResp.cart

  for (const item of cart.items || []) {
    if (item.variant?.manage_inventory) {
      let available = item.variant.inventory_quantity

      // Fallback: If the API stripped the field from the cart response, fetch the product directly
      if (available === undefined && item.variant.product_id) {
        const prodResp = await sdk.client
          .fetch<any>(`/store/products`, {
            method: "GET",
            query: {
              id: item.variant.product_id,
              fields: "*variants,*variants.inventory_quantity",
            },
            headers,
            cache: "no-store",
          })
          .catch(() => null)

        const variant = prodResp?.products?.[0]?.variants?.find(
          (v: any) => v.id === item.variant?.id
        )
        available = variant?.inventory_quantity
      }

      const stock = available ?? 0

      if (item.quantity > stock) {
        return {
          inStock: false,
          message: `Sorry, "${item.product_title}" only has ${stock} left in stock. Please adjust your cart.`,
        }
      }
    }
  }

  return { inStock: true }
}

