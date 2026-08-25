import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { findSaleCategoriesForProduct, syncSalePrices } from "../lib/sale-prices"

/**
 * Keeps generated sale prices in step with the admin.
 *
 * Without this, changing `sale_percent` from 40 to 70 leaves the admin showing 70
 * while the storefront keeps charging 40% — the panel silently disagrees with the
 * site until someone remembers to run the script.
 *
 * Coverage, and where each event comes from:
 *  - editing a category (incl. its metadata) emits `product-category.updated`
 *  - editing a product (incl. its categories) emits `product.updated`
 *  - adding or removing products from the *category* page emits NOTHING of its
 *    own: `batchLinkProductsToCategoryWorkflow` has no emitEventStep. The
 *    `syncSalePricesOnCategoryProducts` middleware in ../api/middlewares.ts
 *    emits `product-category.updated` for that route instead, so both
 *    directions of the link now land here. Do not drop that middleware
 *    expecting the workflow to cover it.
 */
export default async function syncSalePricesHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const id = event.data?.id

  if (!id) return

  try {
    const categoryIds =
      event.name === "product.updated"
        ? await findSaleCategoriesForProduct(container, id)
        : [id]

    // Product edits are far more common than sale edits; bail before doing any
    // pricing work when the product isn't in a sale category at all.
    if (!categoryIds.length) return

    const { synced, cleared } = await syncSalePrices(container, { categoryIds })

    if (synced || cleared) {
      logger.info(
        `[sale-prices] ${event.name} (${id}): ${synced} priced, ${cleared} cleared.`
      )
    }
  } catch (e) {
    // Never let a pricing failure break the admin action that triggered it.
    logger.error(
      `[sale-prices] sync failed for ${event.name} (${id}): ${(e as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["product-category.updated", "product.updated"],
}
