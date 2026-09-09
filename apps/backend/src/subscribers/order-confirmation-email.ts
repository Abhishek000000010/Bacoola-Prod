import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail, type EmailAttachment } from "../lib/email"
import {
  buildCustomerOrderEmail,
  buildAdminOrderEmail,
  toNum,
} from "../lib/email-templates"
import { buildInvoicePdf, invoiceFileName } from "../lib/invoice-pdf"

/**
 * Exported so scripts/preview-invoice.ts renders from the SAME field list the
 * customer's invoice is built from. A preview that queries different fields is
 * not a preview: order totals in Medusa are computed from whatever the query
 * returned, so a missing field shows up as a zero rather than an error.
 */
export const ORDER_INVOICE_FIELDS = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "created_at",
  // `item_subtotal` is GROSS; `item_total` is already net of discounts. Both
  // are needed: the subtotal line shows the gross and the discount is then
  // subtracted from it, or the document subtracts the discount twice.
  "item_subtotal",
  "item_total",
  "shipping_subtotal",
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
  // Gross and net per line, for the same reason as the order-level pair.
  "items.subtotal",
  "items.total",
  "items.discount_total",
  "items.tax_total",
  // The payment provider, named on the invoice's payment row.
  "payment_collections.payments.provider_id",
  // Invoice-only columns. The SKU identifies the exact variant on a document
  // the customer may quote back at support, and hs_code is the item's HSN —
  // the tax classification an Indian invoice line is expected to carry.
  "items.variant_sku",
  "items.product.hs_code",
  "billing_address.first_name",
  "billing_address.last_name",
  "billing_address.address_1",
  "billing_address.address_2",
  "billing_address.city",
  "billing_address.province",
  "billing_address.postal_code",
  "billing_address.country_code",
  "billing_address.phone",
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
 *   • the customer  → order confirmation ("we got your order"), carrying the
 *                     invoice as a PDF attachment (see lib/invoice-pdf.ts).
 *                     The HTML body still repeats the whole summary, so the
 *                     email stands on its own if the attachment is stripped by
 *                     a mail gateway or fails to render.
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
        fields: ORDER_INVOICE_FIELDS,
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

  // --- Invoice PDF ----------------------------------------------------------
  // Best-effort, like everything else here. The email body already contains the
  // full order summary, so a failed render costs the customer an attachment,
  // not their confirmation — never let it take the email down with it.
  let invoice: EmailAttachment | undefined
  try {
    invoice = {
      filename: invoiceFileName(order),
      content: await buildInvoicePdf(order),
      contentType: "application/pdf",
    }
  } catch (err: any) {
    logger.error(
      `[order-confirmation-email] could not render the invoice PDF for order ` +
        `${order.display_id ?? orderId}: ${err?.message ?? err}. ` +
        `Sending the confirmation without an attachment.`
    )
  }

  // --- Customer email -------------------------------------------------------
  if (order.email) {
    const { subject, html } = buildCustomerOrderEmail(order)
    await sendEmail(logger, {
      to: order.email,
      subject,
      html,
      attachments: invoice ? [invoice] : undefined,
    })
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
