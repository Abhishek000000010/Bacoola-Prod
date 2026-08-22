import { HttpTypes } from "@medusajs/types"

/**
 * One grid card per colourway of a product.
 *
 * Listing pages show a single card per product, so a shirt sold in red, green
 * and blue occupies one tile and only ever shows whichever image happens to be
 * the thumbnail. Fashion listings are expected to show each colourway as its
 * own tile.
 *
 * Cards are split on the COLOUR option, not on every variant. Splitting per
 * variant would multiply by size as well -- a shirt in 3 colours x 5 sizes
 * would take 15 near-identical tiles -- which is never what a listing wants.
 * Products with no colour option fall back to one card per variant, so a
 * colour-less product still behaves sensibly.
 */
export type VariantCard = {
  key: string
  variantId?: string
  /** Just the colourway, e.g. "blueee". */
  label?: string
  /** Card heading, e.g. "demo product 2-(blueee)". */
  title: string
  thumbnail?: string | null
  href: string
  /**
   * Sizes buyable in THIS colourway, each already resolved to the variant the
   * quick-add should add.
   *
   * Computed here because this is the last place the full variant list exists.
   * Listing grids hand client components a trimmed product (see
   * `trimToCardFields`) that keeps one variant per colourway and drops
   * `variant.options` entirely, so the tile cannot work out which variant a
   * chosen size belongs to -- the size sheet opened, but every tap resolved to
   * nothing and silently failed. Shipping the mapping is a few dozen bytes per
   * card and keeps the trim's payload win intact.
   */
  sizes?: { value: string; variantId: string }[]
}

/** Matches "color", "Colour", "COLOR" -- spelling is inconsistent across products. */
const isColourOption = (option: any): boolean =>
  /^colou?rs?$/i.test((option?.title ?? "").trim())

/** Matches "size" / "Sizes" -- same spelling drift as colour. */
const isSizeOption = (option: any): boolean =>
  /^sizes?$/i.test((option?.title ?? "").trim())

const valueForOption = (variant: any, optionId: string): string | undefined =>
  (variant?.options ?? []).find((o: any) => o.option_id === optionId)?.value

const explicitImage = (variant: any): string | undefined => {
  const meta = variant?.metadata ?? {}
  const explicit = meta.thumbnail ?? meta.image ?? meta.image_url
  return typeof explicit === "string" && explicit.trim() ? explicit : undefined
}

/**
 * Assigns one image per card.
 *
 * Medusa has no variant->image relation, so this has to be worked out. In
 * priority order:
 *
 *   1. `metadata.thumbnail` / `.image` / `.image_url` on the variant. The only
 *      source that stays correct however images are reordered -- set this to be
 *      certain.
 *   2. An image whose filename mentions the colour ("…/blue-plain-tee.jpg" for
 *      "blueee"). Upload order is unreliable, but filenames usually are not.
 *   3. Whatever images are left, in order, for colours that matched nothing.
 *      Assigning leftovers rather than indexing blindly means one unmatched
 *      colour cannot shunt every other card onto the wrong photo.
 *   4. The product thumbnail.
 *
 * Steps 2-3 are conventions, not guarantees. Set the metadata when a colourway
 * has to be right.
 */
const assignImages = (
  product: HttpTypes.StoreProduct,
  entries: { label?: string; variant: any }[]
): (string | null | undefined)[] => {
  const images = (product.images ?? []).map((i: any) => i.url).filter(Boolean)
  const result: (string | null | undefined)[] = new Array(entries.length)
  const used = new Set<number>()

  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

  entries.forEach((entry, i) => {
    const explicit = explicitImage(entry.variant)
    if (explicit) {
      result[i] = explicit
    }
  })

  // Pass 1: filename mentions the colour.
  entries.forEach((entry, i) => {
    if (result[i] || !entry.label) return

    const label = normalise(entry.label)
    if (label.length < 3) return

    const match = images.findIndex(
      (url: string, idx: number) => !used.has(idx) && normalise(url).includes(label)
    )

    if (match !== -1) {
      used.add(match)
      result[i] = images[match]
    }
  })

  // Pass 2: hand out the remaining images to whatever is still unassigned.
  let next = 0
  entries.forEach((_entry, i) => {
    if (result[i]) return
    while (next < images.length && used.has(next)) next++
    if (next < images.length) {
      used.add(next)
      result[i] = images[next]
    } else {
      result[i] = product.thumbnail
    }
  })

  return result
}

export function getVariantCards(product: HttpTypes.StoreProduct): VariantCard[] {
  const base = `/products/${product.handle}`
  const variants: any[] = (product.variants as any[]) ?? []

  // Nothing to split on -- keep the product's own card.
  if (!variants.length) {
    return [
      {
        key: product.id,
        title: product.title,
        thumbnail: product.thumbnail,
        href: base,
      },
    ]
  }

  const colourOption = (product.options ?? []).find(isColourOption)

  // Group by colourway, preserving the order variants come back in.
  let grouped: { label?: string; variant: any }[] = []

  if (colourOption) {
    const seen = new Set<string>()
    for (const variant of variants) {
      const value = valueForOption(variant, colourOption.id)
      const key = (value ?? "").toLowerCase()
      if (!value || seen.has(key)) continue
      seen.add(key)
      grouped.push({ label: value, variant })
    }
  }

  // No colour option, or none of the variants carry a colour value.
  if (!grouped.length) {
    grouped = variants.map((variant) => ({
      label: variant.title ?? undefined,
      variant,
    }))
  }

  const images = assignImages(product, grouped)

  const sizeOption = (product.options ?? []).find(isSizeOption)

  /**
   * The order sizes are meant to be shown in: S, M, L, XL, XXL rather than
   * whatever order the variants happen to come back in.
   *
   * The option's own `values` carry that order, which is why reading sizes off
   * `sizeOption.values` used to display them correctly. Walking the variant
   * list instead is what makes the per-colourway mapping possible, so the order
   * has to be restored explicitly -- without this the sheet showed "XXL M XL S".
   */
  const sizeRank = new Map<string, number>(
    ((sizeOption?.values ?? []) as any[]).map((v, i) => [v.value, i])
  )

  /**
   * Sizes for one card. With a colour option a card is a colourway, so only
   * that colour's variants qualify; without one every card is already a single
   * variant, and the whole product's sizes are the sensible set to offer.
   *
   * Deduped on the size value, keeping the first variant, so a product that
   * splits a size further (a second option beyond colour and size) still
   * yields one entry per size rather than a repeated chip.
   */
  const sizesForCard = (label?: string) => {
    if (!sizeOption) return undefined

    const seen = new Set<string>()
    const sizes: { value: string; variantId: string }[] = []

    for (const variant of variants) {
      if (colourOption && label !== undefined) {
        if (valueForOption(variant, colourOption.id) !== label) continue
      }

      const value = valueForOption(variant, sizeOption.id)
      if (!value || seen.has(value) || !variant.id) continue

      seen.add(value)
      sizes.push({ value, variantId: variant.id })
    }

    // Unknown values sort last rather than jumping to the front.
    sizes.sort(
      (a, b) =>
        (sizeRank.get(a.value) ?? Number.MAX_SAFE_INTEGER) -
        (sizeRank.get(b.value) ?? Number.MAX_SAFE_INTEGER)
    )

    return sizes.length ? sizes : undefined
  }

  return grouped.map(({ label, variant }, index) => ({
    key: variant.id,
    variantId: variant.id,
    label,
    title: label ? `${product.title}-(${label})` : product.title,
    thumbnail: images[index],
    href: `${base}?v_id=${variant.id}`,
    sizes: sizesForCard(colourOption ? label : undefined),
  }))
}
