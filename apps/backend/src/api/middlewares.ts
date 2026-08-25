import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { parseSalePercent } from "../lib/sale-prices"

/**
 * Refuses to publish a product whose variants lack shipping dimensions.
 *
 * Shiprocket will not create an order unless every item has weight AND
 * length/width/height, and Medusa's fulfillment workflow only ever reads
 * VARIANT-level values (`items.variant.*`) -- product-level dimensions are
 * loaded but never used for shipping, so setting them there does nothing.
 *
 * Without this guard the failure is invisible and expensive: the product
 * publishes, sells, the customer pays, the order looks complete, and only the
 * fulfillment silently never reaches Shiprocket.
 *
 * Deliberately gates PUBLISHING rather than saving. The admin creates a product
 * and its variants in separate requests, so rejecting every incomplete save
 * would break the normal add-product flow; drafts stay freely editable and the
 * check bites only when the product would become visible to customers.
 */

const DIMENSION_FIELDS = ["weight", "length", "width", "height"] as const

type Dimensioned = Partial<Record<(typeof DIMENSION_FIELDS)[number], unknown>>

const missingDimensions = (variant: Dimensioned): string[] =>
  DIMENSION_FIELDS.filter((field) => {
    const value = variant?.[field]
    return value === null || value === undefined || Number(value) <= 0
  })

/**
 * A variant with no price cannot be sold: Medusa refuses to add it to a cart,
 * so the storefront shows a price-shaped blank and an add button that only
 * fails once clicked. Publishing one is never intentional.
 */
const hasNoPrice = (variant: any): boolean =>
  !Array.isArray(variant?.prices) || variant.prices.length === 0

const describe = (variant: any, index: number): string =>
  variant?.title || variant?.sku || `variant #${index + 1}`

const reject = (res: MedusaResponse, problems: string[]) =>
  res.status(400).json({
    type: "invalid_data",
    message:
      `Cannot publish: ${problems.join("; ")}. ` +
      `Every variant needs a price, plus weight/length/width/height to ship. ` +
      `Set these on each VARIANT (product-level dimensions are ignored for shipping).`,
  })

/**
 * Guards POST /admin/products and POST /admin/products/:id.
 *
 * On update the incoming body is partial, so the product's current status and
 * stored variants are consulted for anything the request does not itself carry.
 */
export async function validateProductPublish(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const body = (req.body ?? {}) as any
    const productId = (req.params as any)?.id

    let currentStatus: string | undefined
    let storedVariants: any[] = []
    let storedProfileId: string | undefined
    let storedOptions: any[] = []

    if (productId) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "product",
        fields: [
          "id",
          "status",
          "shipping_profile.id",
          "options.title",
          "options.values.value",
          "variants.id",
          "variants.title",
          "variants.sku",
          "variants.prices.*",
          ...DIMENSION_FIELDS.map((f) => `variants.${f}`),
        ],
        filters: { id: productId },
      })
      currentStatus = data?.[0]?.status
      storedVariants = data?.[0]?.variants ?? []
      storedProfileId = data?.[0]?.shipping_profile?.id
      storedOptions = data?.[0]?.options ?? []
    }

    const resultingStatus = body.status ?? currentStatus

    // Only publishing is gated. Drafts, proposals and archives pass untouched.
    if (resultingStatus !== "published") {
      return next()
    }

    // A product with no shipping profile cannot be checked out at all: the
    // cart's validate-shipping step matches each item's profile against the
    // chosen shipping method, an absent one never matches, and completion
    // throws. The customer pays, no order is created, and nothing reaches
    // Shiprocket -- so the money is taken with no record to reconcile it
    // against. Publishing is the last point where this is still cheap to catch.
    const resultingProfileId =
      body.shipping_profile_id !== undefined
        ? body.shipping_profile_id
        : storedProfileId

    if (!resultingProfileId) {
      return res.status(400).json({
        type: "invalid_data",
        message:
          `Cannot publish: this product has no shipping profile. ` +
          `Without one the cart cannot be completed -- the customer's payment goes through ` +
          `but no order is ever created. Select a shipping profile on the product first.`,
      })
    }

    // A "Size" option with at least one value is required to publish. Without it
    // the storefront has no size picker and falls back to a hardcoded XS-XL strip
    // that does not reflect what is actually sellable. Gated at publish (not
    // create) so a product can be drafted first and sized before going live.
    // Options named in the request win; otherwise fall back to what is stored.
    const options: any[] = Array.isArray(body.options) ? body.options : storedOptions
    const sizeOption = options.find((o) => SIZE_OPTION.test((o?.title ?? "").trim()))
    const sizeValues: any[] = Array.isArray(sizeOption?.values) ? sizeOption.values : []

    if (!sizeOption || !sizeValues.length) {
      return res.status(400).json({
        type: "invalid_data",
        message:
          `Cannot publish: a "Size" option with at least one value is required. ` +
          `Without it the storefront has no size picker to show. ` +
          `Add an option titled "Size" (e.g. S, M, L, XL) before publishing.`,
      })
    }

    // Variants named in the request win; otherwise fall back to what is stored.
    // A create request carries them inline and has nothing stored yet.
    // Merge by id on update: a partial body (e.g. dimensions only) would
    // otherwise look priceless even when prices are already stored.
    const bodyVariants: any[] = Array.isArray(body.variants) ? body.variants : []
    const variants: any[] = bodyVariants.length
      ? bodyVariants.map((v) => {
          const stored = storedVariants.find((s: any) => s.id && s.id === v.id)
          return stored ? { ...stored, ...v } : v
        })
      : storedVariants

    // A product with no variants cannot be bought either.
    if (!variants.length) {
      return reject(res, ["a product needs at least one variant"])
    }

    const problems = variants
      .map((variant, index) => {
        const faults: string[] = []
        if (hasNoPrice(variant)) {
          faults.push("no price")
        }
        const missing = missingDimensions(variant)
        if (missing.length) {
          faults.push(`missing ${missing.join(", ")}`)
        }
        return faults.length ? `${describe(variant, index)}: ${faults.join(" and ")}` : null
      })
      .filter(Boolean) as string[]

    if (problems.length) {
      return reject(res, problems)
    }

    return next()
  } catch (err) {
    // A guard that breaks the admin is worse than one that misses an edge case;
    // fall through and let the normal request handling proceed.
    return next()
  }
}

/**
 * Guards variant create/update on an already-published product, which would
 * otherwise be a way to add an unshippable variant to a live product without
 * ever touching the product's own status.
 */
export async function validateVariantPublish(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const body = (req.body ?? {}) as any
    const productId = (req.params as any)?.id
    const variantId = (req.params as any)?.variant_id

    if (!productId) {
      return next()
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "status"],
      filters: { id: productId },
    })

    if (data?.[0]?.status !== "published") {
      return next()
    }

    let candidate: Dimensioned = body

    // An update body is partial: merge it over the stored variant so untouched
    // dimensions still count as present.
    if (variantId) {
      const { data: stored } = await query.graph({
        entity: "product_variant",
        fields: ["id", "title", "sku", ...DIMENSION_FIELDS],
        filters: { id: variantId },
      })
      candidate = { ...(stored?.[0] ?? {}), ...body }
    }

    const missing = missingDimensions(candidate)
    if (missing.length) {
      return reject(res, [`${describe(candidate, 0)}: ${missing.join(", ")}`])
    }

    return next()
  } catch (err) {
    return next()
  }
}

/**
 * Matches an option titled "Size" / "Sizes" (case-insensitive). A published
 * product must carry one -- enforced by validateProductPublish, which gates at
 * publish rather than create so products can be drafted first and sized before
 * going live.
 */
const SIZE_OPTION = /^sizes?$/i

// Retained for callers/tests that still reference it; publish gating now lives
// in validateProductPublish.
export async function validateSizeOption(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const body = (req.body ?? {}) as any
    const options: any[] = Array.isArray(body.options) ? body.options : []

    const sizeOption = options.find((o) => SIZE_OPTION.test((o?.title ?? "").trim()))

    const values: any[] = Array.isArray(sizeOption?.values) ? sizeOption.values : []

    if (!sizeOption || !values.length) {
      return res.status(400).json({
        type: "invalid_data",
        message:
          `Cannot create product: a "Size" option with at least one value is required. ` +
          `Without it the storefront has no size picker to show. ` +
          `Add an option titled "Size" (e.g. S, M, L, XL) before saving.`,
      })
    }

    return next()
  } catch (err) {
    return next()
  }
}

/**
 * Enforces that a product lives in a single sub-category.
 *
 * A "sub-category" is any real, non-sale category (e.g. "Men > T-shirts"). A
 * product may be linked to exactly one of them, plus any number of sale
 * categories -- a sale category being one that (itself or via an ancestor)
 * carries `metadata.sale_percent`. So "Men > T-shirts" + "Men > Sale" is fine,
 * but "Men > T-shirts" + "Men > Jeans" is not.
 *
 * This makes "same category" unambiguous, which the storefront's price-ranked
 * recommendations rely on: each product resolves to one category, so the set of
 * products to recommend (and sort by nearest price) has a single clear source.
 *
 * Linking to both a category and its own ancestor (e.g. "Men" and
 * "Men > T-shirts") counts as one membership -- the deepest node wins.
 */
type Cat = {
  id: string
  handle?: string
  parent_category_id?: string | null
  metadata?: Record<string, unknown> | null
}

async function loadCategories(req: MedusaRequest): Promise<Map<string, Cat>> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "parent_category_id", "metadata"],
  })
  return new Map<string, Cat>((data as Cat[]).map((c) => [c.id, c]))
}

// The category and its ancestors, nearest first (index 0 is the category itself).
function ancestorsOf(byId: Map<string, Cat>, id: string): Cat[] {
  const chain: Cat[] = []
  let current = byId.get(id)
  let guard = 0
  while (current && guard++ < 20) {
    chain.push(current)
    current = current.parent_category_id ? byId.get(current.parent_category_id) : undefined
  }
  return chain
}

/**
 * The category that owns sale pricing for `id`: itself if it declares
 * `metadata.sale_percent`, otherwise its nearest ancestor that does.
 *
 * Nearest, not outermost, because a descendant declaring its own percent takes
 * over its subtree -- the same rule syncSalePrices walks when it collects a
 * subtree. Null when nothing in the chain is on sale.
 */
function nearestSaleCategory(byId: Map<string, Cat>, id: string): Cat | null {
  return (
    ancestorsOf(byId, id).find(
      (c) => parseSalePercent(c.metadata?.sale_percent) !== null
    ) ?? null
  )
}

// A category is "sale" when it or any ancestor declares metadata.sale_percent.
function isSaleCategory(byId: Map<string, Cat>, id: string): boolean {
  return nearestSaleCategory(byId, id) !== null
}

/**
 * The distinct non-sale sub-categories a set of memberships resolves to. A
 * category that is a strict ancestor of another selected category is dropped, so
 * a path like "Men" + "Men > T-shirts" collapses to just the leaf.
 */
function distinctSubCategories(byId: Map<string, Cat>, categoryIds: string[]): Cat[] {
  const nonSale = [...new Set(categoryIds)].filter(
    (id) => byId.has(id) && !isSaleCategory(byId, id)
  )
  const leaves = nonSale.filter(
    (id) =>
      !nonSale.some(
        (other) =>
          other !== id && ancestorsOf(byId, other).slice(1).some((a) => a.id === id)
      )
  )
  return leaves.map((id) => byId.get(id)!)
}

const labelOf = (c: Cat): string => c.handle ?? c.id

const rejectMultiCategory = (res: MedusaResponse, found: Cat[], detail: string) =>
  res.status(400).json({
    type: "invalid_data",
    message:
      `Cannot save: this product would belong to ${found.length} sub-categories ` +
      `(${found.map(labelOf).join(", ")}). A product must live in a single ` +
      `sub-category (sale categories aside). ${detail}`,
  })

export async function validateSingleCategory(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const body = (req.body ?? {}) as any

    // The admin sends either shape depending on the screen used.
    const incoming: string[] = Array.isArray(body.category_ids)
      ? body.category_ids
      : Array.isArray(body.categories)
      ? body.categories.map((c: any) => c?.id ?? c).filter(Boolean)
      : []

    // Requests that do not touch categories are none of this guard's business.
    if (!incoming.length) {
      return next()
    }

    const byId = await loadCategories(req)
    const subCategories = distinctSubCategories(byId, incoming)

    if (subCategories.length > 1) {
      return rejectMultiCategory(
        res,
        subCategories,
        `Keep only the one sub-category this product actually belongs to.`
      )
    }

    return next()
  } catch (err) {
    return next()
  }
}

/**
 * Guards the other direction: adding products to a category from the category's
 * own screen, which never touches the product update route above.
 */
export async function validateCategoryProducts(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const body = (req.body ?? {}) as any
    const categoryId = (req.params as any)?.id
    const add: string[] = Array.isArray(body.add) ? body.add : []

    if (!categoryId || !add.length) {
      return next()
    }

    const byId = await loadCategories(req)

    // Adding a product into a sale category never creates a second sub-category,
    // so it is always allowed.
    if (isSaleCategory(byId, categoryId)) {
      return next()
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "categories.id"],
      filters: { id: add },
    })

    const conflicts: string[] = []

    for (const product of products as any[]) {
      const existing = (product.categories ?? []).map((c: any) => c.id)
      const resulting = distinctSubCategories(byId, [...existing, categoryId])

      if (resulting.length > 1) {
        const others = resulting.filter((c) => c.id !== categoryId)
        conflicts.push(`${product.handle} (already in ${others.map(labelOf).join(", ")})`)
      }
    }

    if (conflicts.length) {
      return rejectMultiCategory(
        res,
        [byId.get(categoryId)!, { id: "other", handle: "another sub-category" }],
        `Conflicting products: ${conflicts.join("; ")}.`
      )
    }

    return next()
  } catch (err) {
    return next()
  }
}

/**
 * Rebuilds sale pricing after products are linked to (or unlinked from) a
 * category on the CATEGORY screen.
 *
 * The sale-prices subscriber listens for `product.updated`, which covers
 * assigning categories from the product screen. The category screen goes
 * through `batchLinkProductsToCategoryWorkflow`, which has no emitEventStep --
 * so no event, no sync, and the product sits in the sale category at full
 * price while every product added the other way is discounted. That is the
 * "added it from the category page and it never went on sale" bug.
 *
 * This closes the gap by emitting the event the workflow does not, rather than
 * calling syncSalePrices here: the subscriber already owns the error handling
 * and the scoping, and going through the (Redis-backed) event bus keeps the
 * rebuild off the admin's request -- a large sale category takes seconds to
 * reprice and the admin must not sit waiting for it.
 *
 * Fires on `remove` as well as `add`: dropping a product from a sale category
 * has to withdraw its discounted prices, or the list keeps pricing a product
 * that is no longer in the sale.
 */
export async function syncSalePricesOnCategoryProducts(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const body = (req.body ?? {}) as any
    const categoryId = (req.params as any)?.id
    const touched: string[] = [
      ...(Array.isArray(body.add) ? body.add : []),
      ...(Array.isArray(body.remove) ? body.remove : []),
    ]

    if (categoryId && touched.length) {
      const byId = await loadCategories(req)

      // Only a category inside a sale subtree has generated prices to rebuild.
      // Linking into a plain sub-category changes no sale list, so skip the work.
      const saleCategory = nearestSaleCategory(byId, categoryId)

      if (saleCategory) {
        // Resolved HERE, while the request scope is alive. `req.scope` is a
        // per-request container; reaching into it from the `finish` handler
        // below would be resolving from a scope the framework may already have
        // torn down. Holding the module instance sidesteps that entirely.
        const eventBus = req.scope.resolve(Modules.EVENT_BUS)
        const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

        // After the response, not before: the link rows do not exist until the
        // route handler has run, and a sync that reads the old membership would
        // rebuild the list without the product that was just added.
        res.on("finish", () => {
          // Guard rejected requests -- validateCategoryProducts above turns a
          // second sub-category into a 400, and nothing was linked.
          if (res.statusCode >= 400) {
            return
          }

          Promise.resolve(
            eventBus.emit({
              name: "product-category.updated",
              data: { id: saleCategory.id },
            })
          ).catch((e: Error) =>
            logger.error(
              `[sale-prices] could not queue a sync for ${labelOf(saleCategory)}: ${e.message}`
            )
          )
        })
      }
    }
  } catch (err) {
    // Same rule as the guards above: never break the admin action. Worst case
    // the sale price is stale until the next product edit or a manual
    // `medusa exec ./src/scripts/sync-sale-prices.ts`.
  }

  return next()
}

/**
 * Refuses to delete a product's last variant.
 *
 * A product with no variants cannot be priced, added to a cart, or published --
 * it is simply broken, and the admin offers no way back except recreating the
 * variant. Deleting variants one by one makes this easy to walk into, so the
 * rule lives here rather than only in the bulk-delete widget.
 */
export async function validateVariantDelete(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const productId = (req.params as any)?.id

    if (!productId) {
      return next()
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "variants.id"],
      filters: { id: productId },
    })

    const variantCount = data?.[0]?.variants?.length ?? 0

    if (variantCount <= 1) {
      return res.status(400).json({
        type: "not_allowed",
        message:
          `Cannot delete the last variant: a product needs at least one variant ` +
          `to be priced, sold, or published. Add another variant first, or delete the product itself.`,
      })
    }

    return next()
  } catch (err) {
    return next()
  }
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products/:id/variants/:variant_id",
      method: "DELETE",
      middlewares: [validateVariantDelete],
    },
    {
      matcher: "/admin/products",
      method: "POST",
      middlewares: [validateProductPublish, validateSingleCategory],
    },
    {
      matcher: "/admin/products/:id",
      method: "POST",
      middlewares: [validateProductPublish, validateSingleCategory],
    },
    {
      matcher: "/admin/product-categories/:id/products",
      method: "POST",
      middlewares: [validateCategoryProducts, syncSalePricesOnCategoryProducts],
    },
    {
      matcher: "/admin/products/:id/variants",
      method: "POST",
      middlewares: [validateVariantPublish],
    },
    {
      matcher: "/admin/products/:id/variants/:variant_id",
      method: "POST",
      middlewares: [validateVariantPublish],
    },
  ],
})
