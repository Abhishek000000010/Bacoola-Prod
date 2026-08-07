import { HttpTypes } from "@medusajs/types"
import { VariantCard } from "./variant-cards"

const WISHLIST_STORAGE_KEY = "bacoola_wishlist_items"

/**
 * One saved item. Listing grids render a product as one tile per colourway, so
 * the wishlist is keyed per colourway (`card.variantId`), not per product --
 * otherwise saving one colour flips every colour's heart and stores a single
 * entry for the whole product. `card` is what the tile needs to render the
 * right colourway; entries saved from a whole-product button (e.g. the product
 * page) carry no card and fall back to the product's own tile.
 */
export type WishlistEntry = {
  key: string
  card?: VariantCard
  product: HttpTypes.StoreProduct
}

/** The identity a heart toggles: the colourway when there is one, else the product. */
export function wishlistKey(
  product: HttpTypes.StoreProduct,
  card?: VariantCard
): string {
  return card?.variantId ?? card?.key ?? product.id
}

/**
 * Reads the stored entries, migrating the legacy shape (a bare array of
 * products, keyed per product) so older saved lists don't throw or vanish.
 */
export function getWishlist(): WishlistEntry[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(WISHLIST_STORAGE_KEY)
    if (!data) return []
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item: any): WishlistEntry | null => {
        if (item && typeof item === "object" && "product" in item && item.product?.id) {
          return {
            key: item.key ?? wishlistKey(item.product, item.card),
            card: item.card,
            product: item.product,
          }
        }
        // Legacy: the item *is* the product.
        if (item?.id) {
          return { key: item.id, product: item }
        }
        return null
      })
      .filter((e): e is WishlistEntry => e !== null)
  } catch (e) {
    console.error("Error reading wishlist from localStorage", e)
    return []
  }
}

export function isItemInWishlist(key: string): boolean {
  if (typeof window === "undefined") return false
  return getWishlist().some((item) => item.key === key)
}

/**
 * Adds or removes the given colourway (or product). Returns the new "is saved"
 * state and broadcasts `wishlist-updated` so every heart and the nav count for
 * the SAME key stay in sync -- other keys re-read from storage and are left
 * untouched.
 */
export function toggleWishlistItem(
  product: HttpTypes.StoreProduct,
  card?: VariantCard
): boolean {
  if (typeof window === "undefined" || !product?.id) return false

  const key = wishlistKey(product, card)
  const currentItems = getWishlist()
  const exists = currentItems.some((item) => item.key === key)

  const updated = exists
    ? currentItems.filter((item) => item.key !== key)
    : [...currentItems, { key, card, product }]

  try {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent("wishlist-updated", {
        detail: { key, isWishlisted: !exists },
      })
    )
  } catch (e) {
    console.error("Error updating wishlist in localStorage", e)
  }

  return !exists
}
