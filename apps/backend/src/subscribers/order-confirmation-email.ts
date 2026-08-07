import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "../lib/email"
import {
  buildCustomerOrderEmail,
  buildAdminOrderEmail,
  toNum,
} from "../lib/email-templates"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "created_at",
  "item_total",
  "shipping_total",
  "tax_total",
  "discount_total",
  "total",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.raw_quantity",
  "items.detail.quantity",
  "items.unit_price",
  "items.total",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.country_code",
  "shipping_address.phone",
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Send order-confirmation emails right after an order is placed.
 *
 * Listens to the same `order.placed` event as the Shiprocket auto-fulfill
 * subscriber, but is a SEPARATE handler on purpose: emailing and fulfilling are
 * independent concerns, and a failure in one must not block the other. Medusa
 * runs every subscriber registered for an event independently.
 *
 * Two emails go out:
 *   • the customer  → order confirmation ("we got your order")
 *   • the store     → new-order notification (ORDER_NOTIFICATION_EMAIL)
 *
 * Everything is best-effort: the order is already paid, so no email failure is
 * ever allowed to throw here (that would just retry against the same state and
 * churn the worker). sendEmail() already swallows its own errors; this handler
 * additionally guards the data-loading step.
 */
export default async function orderConfirmationEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderId = event.data.id

  // The `order.placed` event can fire before the order's monetary totals have
  // settled — the first send rendered ₹0.00 / qty 0 for exactly this reason.
  // Re-read a few times until `total` is populated so the email has real
  // numbers. Best-effort: if it never settles we still send (with whatever we
  // have) rather than drop the confirmation entirely.
  let order: any
  const MAX_ATTEMPTS = 8
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data } = await query.graph({
        entity: "order",
        fields: ORDER_FIELDS,
        filters: { id: orderId },
      })
      order = data?.[0]
    } catch (err: any) {
      logger.error(
        `[order-confirmation-email] could not load order ${orderId} ` +
          `(attempt ${attempt}): ${err?.message ?? err}`
      )
      return
    }

    if (!order) {
      logger.warn(`[order-confirmation-email] order ${orderId} not found; skipping`)
      return
    }

    if (toNum(order.total) > 0) break

    if (attempt < MAX_ATTEMPTS) {
      await sleep(500)
    } else {
      logger.warn(
        `[order-confirmation-email] order ${
          order.display_id ?? orderId
        } totals still not settled after ${MAX_ATTEMPTS} attempts; ` +
          `sending anyway with available data`
      )
    }
  }

  // --- Customer email -------------------------------------------------------
  if (order.email) {
    const { subject, html } = buildCustomerOrderEmail(order)
    await sendEmail(logger, { to: order.email, subject, html })
  } else {
    logger.warn(
      `[order-confirmation-email] order ${
        order.display_id ?? orderId
      } has no email; skipping customer confirmation`
    )
  }

  // --- Admin / store-owner notification ------------------------------------
  const adminTo = process.env.ORDER_NOTIFICATION_EMAIL
  if (adminTo) {
    const { subject, html } = buildAdminOrderEmail(order)
    await sendEmail(logger, { to: adminTo, subject, html })
  } else {
    logger.warn(
      "[order-confirmation-email] ORDER_NOTIFICATION_EMAIL not set; skipping " +
        "store-owner notification"
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
