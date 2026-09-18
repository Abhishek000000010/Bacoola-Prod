import { HttpTypes } from "@medusajs/types"
import { ProductCard, toProductCards } from "@lib/util/product-cards"
import { LookItem, parseLook, ResolvedLook } from "@lib/util/look"
import { listProducts } from "./products"

const isColourOption = (option: any): boolean =>
  /^colou?rs?$/i.test((option?.title ?? "").trim())

const colourOf = (product: HttpTypes.StoreProduct, variant: any) => {
  const colourOption = (product.options ?? []).find(isColourOption)
  if (!colourOption) return undefined
  return (variant?.options ?? []).find((o: any) => o.option_id === colourOption.id)
    ?.value as string | undefined
}

const inStock = (v: any) =>
  !v.manage_inventory || v.allow_backorder || (v.inventory_quantity ?? 0) > 0

/**
 * Resolves a product's curated look (`metadata.look`) into tiles.
 *
 * Runs on the server so the page ships finished tiles -- trimmed the same way
 * as listing grids -- instead of every linked product in full, and so whether
 * the SEE LOOK button exists is known on first paint.
 *
 * Items are dropped silently when the linked product is deleted or unpublished
 * (the store API doesn't return it), or when the chosen colourway -- the whole
 * product, if no colour was chosen -- has nothing in stock.
 */
export async function getResolvedLook(
  product: HttpTypes.StoreProduct,
  countryCode: string
): Promise<ResolvedLook | null> {
  const look = parseLook(product.metadata as Record<string, unknown> | null)
  if (!look) return null

  const all = [look.default, ...Object.values(look.colours)].flat()
  const ids = [...new Set(all.map((i) => i.product_id))]

  const linked = await listProducts({
    countryCode,
    queryParams: { id: ids, limit: ids.length },
    tier: "full",
  })
    .then(({ response }) => response.products)
    .catch(() => [] as HttpTypes.StoreProduct[])

  const byId = new Map(linked.map((p) => [p.id, p]))
  const cardsById = new Map(linked.map((p) => [p.id, toProductCards([p])]))

  const resolve = (items: LookItem[]): ProductCard[] => {
    const seen = new Set<string>()

    return items.flatMap((item) => {
      const linkedProduct = byId.get(item.product_id)
      const cards = cardsById.get(item.product_id)
      if (!linkedProduct || !cards?.length) return []

      const variants = (linkedProduct.variants ?? []) as any[]
      const pinned = item.variant_id
        ? variants.find((v) => v.id === item.variant_id)
        : undefined
      // A pinned variant that no longer exists falls back to the whole product.
      const colour = pinned ? colourOf(linkedProduct, pinned) : undefined

      const candidates = colour
        ? variants.filter((v) => colourOf(linkedProduct, v) === colour)
        : variants
      if (!candidates.some(inStock)) return []

      const card =
        (colour && cards.find((c) => c.card.label === colour)) ||
        cards.find((c) => c.card.thumbnail === linkedProduct.thumbnail) ||
        cards[0]

      // The same colourway added twice renders once.
      if (seen.has(card.card.key)) return []
      seen.add(card.card.key)

      return [card]
    })
  }

  const colours: Record<string, ProductCard[]> = {}
  for (const [colour, items] of Object.entries(look.colours)) {
    const cards = resolve(items)
    if (cards.length) colours[colour] = cards
  }

  const resolved = { default: resolve(look.default), colours }
  return resolved.default.length || Object.keys(colours).length ? resolved : null
}
