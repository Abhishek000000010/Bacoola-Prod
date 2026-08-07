import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "./email"
import { buildRestockEmail } from "./email-templates"
import { RESTOCK_NOTIFICATION_MODULE } from "../modules/restock-notification"
import type { RestockNotificationService } from "../modules/restock-notification/service"

/**
 * Emails shoppers whose requested variant is now back in stock, then marks those
 * requests notified.
 *
 * Why a poll instead of an event: Medusa's inventory module emits NO event when
 * stock changes (the admin "update location level" route runs
 * updateInventoryLevelsWorkflow, which emits nothing), so an event subscriber
 * never fires. A scheduled job that re-checks pending requests is the reliable
 * trigger. Pending rows clear as soon as they're notified, so each run is cheap.
 *
 * Availability is summed from the variant's inventory location levels
 * (stocked − reserved), mirroring the storefront's in-stock rule. A variant that
 * doesn't manage inventory, or allows backorder, counts as always available.
 *
 * Best-effort throughout: a single email failure leaves that row pending so the
 * next run retries it.
 */
export async function processRestockNotifications(
  container: MedusaContainer
): Promise<{ checked: number; notified: number }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const service: RestockNotificationService = container.resolve(
    RESTOCK_NOTIFICATION_MODULE
  )

  const pending = await service
    .listRestockSubscriptions({ notified_at: null })
    .catch(() => [] as any[])
  if (!pending.length) return { checked: 0, notified: 0 }

  const storeUrl = (process.env.STOREFRONT_URL || "").replace(/\/+$/, "")
  const variantIds = [...new Set(pending.map((s: any) => s.variant_id))]

  const availability = new Map<string, boolean>()
  const handleByVariant = new Map<string, string | undefined>()

  for (const variantId of variantIds) {
    try {
      const { data } = await query.graph({
        entity: "product_variant",
        fields: [
          "id",
          "manage_inventory",
          "allow_backorder",
          "product.handle",
          "inventory_items.inventory.location_levels.stocked_quantity",
          "inventory_items.inventory.location_levels.reserved_quantity",
        ],
        filters: { id: variantId },
      })
      const variant: any = data?.[0]
      handleByVariant.set(variantId, variant?.product?.handle)

      if (!variant) {
        availability.set(variantId, false)
        continue
      }
      if (!variant.manage_inventory || variant.allow_backorder) {
        availability.set(variantId, true)
        continue
      }

      let available = 0
      for (const item of variant.inventory_items ?? []) {
        for (const level of item?.inventory?.location_levels ?? []) {
          available +=
            Number(level?.stocked_quantity ?? 0) - Number(level?.reserved_quantity ?? 0)
        }
      }
      availability.set(variantId, available > 0)
    } catch (err: any) {
      logger.warn(
        `[restock-notify] availability check failed for ${variantId}: ${err?.message ?? err}`
      )
      availability.set(variantId, false)
    }
  }

  const nowInStock = pending.filter((s: any) => availability.get(s.variant_id))
  if (!nowInStock.length) return { checked: pending.length, notified: 0 }

  logger.info(
    `[restock-notify] ${nowInStock.length} pending request(s) now back in stock`
  )

  let notified = 0
  for (const sub of nowInStock as any[]) {
    const handle = handleByVariant.get(sub.variant_id)
    const productUrl = storeUrl && handle ? `${storeUrl}/products/${handle}` : null

    const { subject, html } = buildRestockEmail({
      productTitle: sub.product_title,
      variantTitle: sub.variant_title,
      productUrl,
    })

    const sent = await sendEmail(logger, { to: sub.email, subject, html })

    if (sent) {
      notified++
      await service
        .updateRestockSubscriptions({ id: sub.id, notified_at: new Date() })
        .catch((err: any) =>
          logger.warn(
            `[restock-notify] could not mark ${sub.id} notified: ${err?.message ?? err}`
          )
        )
    }
  }

  return { checked: pending.length, notified }
}
