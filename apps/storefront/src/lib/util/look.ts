import { ProductCard } from "./product-cards"

/**
 * "See look": the other products worn in a product's photos.
 *
 * Curated by hand in admin (widget `product-look.tsx`) and stored on the
 * product as `metadata.look`:
 *
 *   {
 *     default: LookItem[],              // any colour without its own look
 *     colours: { [colour]: LookItem[] } // keyed by the Colour option value
 *   }
 *
 * A look is per colour because the photos are: the navy tee is shot with white
 * jeans, the white tee with blue ones. `variant_id` pins the colourway of the
 * linked product (white jeans, not just "jeans"); it is any variant of that
 * colour, size is irrelevant.
 *
 * MUST stay in sync with apps/backend/src/admin/widgets/product-look.tsx.
 */
export type LookItem = { product_id: string; variant_id?: string }

export type Look = {
  default: LookItem[]
  colours: Record<string, LookItem[]>
}

/** The same shape, resolved server-side into renderable, in-stock tiles. */
export type ResolvedLook = {
  default: ProductCard[]
  colours: Record<string, ProductCard[]>
}

const toItems = (raw: unknown): LookItem[] =>
  Array.isArray(raw)
    ? raw
        .filter(
          (i): i is LookItem =>
            !!i && typeof i === "object" && typeof (i as any).product_id === "string"
        )
        .map((i) => ({
          product_id: i.product_id,
          variant_id: typeof i.variant_id === "string" ? i.variant_id : undefined,
        }))
    : []

export function parseLook(
  metadata: Record<string, unknown> | null | undefined
): Look | null {
  let raw = metadata?.look as any
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!raw || typeof raw !== "object") return null

  const colours: Record<string, LookItem[]> = {}
  for (const [colour, items] of Object.entries(raw.colours ?? {})) {
    const parsed = toItems(items)
    if (parsed.length) colours[colour] = parsed
  }

  const look = { default: toItems(raw.default), colours }
  return look.default.length || Object.keys(colours).length ? look : null
}

/**
 * The tiles for the colour currently shown: that colour's own look, else the
 * default. An empty result means the SEE LOOK button is not rendered.
 */
export function lookForColour(
  look: ResolvedLook | null | undefined,
  colour?: string
): ProductCard[] {
  if (!look) return []
  const own = colour ? look.colours[colour] : undefined
  return own?.length ? own : look.default
}
