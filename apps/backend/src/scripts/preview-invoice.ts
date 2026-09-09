import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import fs from "fs"
import path from "path"
import { buildInvoicePdf, invoiceFileName } from "../lib/invoice-pdf"
import { ORDER_INVOICE_FIELDS } from "../subscribers/order-confirmation-email"

/**
 * Render a real order's invoice to a file, without sending anything.
 *
 *   npx medusa exec ./src/scripts/preview-invoice.ts 57
 *
 * Uses the exact field list the order-confirmation subscriber queries, so what
 * comes out is what the customer would receive — including any field the query
 * forgets to ask for. (Order totals are computed from the items the query
 * returns: omit `items.detail.quantity` and every total silently reads zero.)
 */
export default async function previewInvoice({ container, args }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const displayId = Number(args?.[0] ?? 0)

  // Medusa types `display_id` as a string filter even though the column is
  // numeric and matches on either, hence the cast rather than a String() that
  // would quietly stop matching.
  const graphArgs: any = {
    entity: "order",
    fields: ORDER_INVOICE_FIELDS,
    ...(displayId
      ? { filters: { display_id: displayId } }
      : { pagination: { take: 1, order: { created_at: "DESC" } } }),
  }
  const { data } = await query.graph(graphArgs)

  const order: any = data?.[0]
  if (!order) {
    logger.error(`[preview-invoice] no order found for display_id ${displayId}`)
    return
  }

  const outDir = path.resolve(process.cwd(), "invoice-previews")
  fs.mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, invoiceFileName(order))
  fs.writeFileSync(out, await buildInvoicePdf(order))

  const n = (v: any) =>
    v == null ? 0 : typeof v === "object" ? Number(v.numeric ?? v.value) : Number(v)

  // Print the arithmetic the document states, so a mismatch is caught here
  // rather than by a customer reading the PDF.
  const gross = n(order.item_subtotal)
  const disc = Math.abs(n(order.discount_total))
  const ship = n(order.shipping_total)
  const total = n(order.total)
  logger.info(
    `[preview-invoice] ${out}\n` +
      `  subtotal ${gross} - discount ${disc} + shipping ${ship} = ${gross - disc + ship}\n` +
      `  order total                                    = ${total}\n` +
      `  ${gross - disc + ship === total ? "RECONCILES" : "*** MISMATCH ***"}`
  )
}
