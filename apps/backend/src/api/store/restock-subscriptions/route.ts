import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import { RESTOCK_NOTIFICATION_MODULE } from "../../../modules/restock-notification"
import type { RestockNotificationService } from "../../../modules/restock-notification/service"

const schema = z.object({
  email: z.string().email(),
  variant_id: z.string().min(1),
})

/**
 * POST /store/restock-subscriptions
 * Body: { email, variant_id }
 *
 * Records a request to be emailed when `variant_id` is back in stock. Idempotent
 * per (email, variant): a shopper who signs up twice while still un-notified
 * just gets the existing pending row, so a restock emails them once.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "A valid email and variant_id are required." })
  }
  const { email, variant_id } = parsed.data
  const normalisedEmail = email.trim().toLowerCase()

  const service: RestockNotificationService = req.scope.resolve(
    RESTOCK_NOTIFICATION_MODULE
  )

  // Idempotency: reuse any pending (not-yet-notified) request for this pair.
  const existing = await service.listRestockSubscriptions({
    email: normalisedEmail,
    variant_id,
    notified_at: null,
  })
  if (existing.length) {
    return res.status(200).json({ success: true, already_subscribed: true })
  }

  // Denormalise titles for a friendlier email + admin view. Best-effort — a
  // failed lookup must not stop the sign-up.
  let variant_title: string | null = null
  let product_title: string | null = null
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product_variant",
      fields: ["title", "product.title"],
      filters: { id: variant_id },
    })
    variant_title = data?.[0]?.title ?? null
    product_title = (data?.[0] as any)?.product?.title ?? null
  } catch {
    // ignore — titles are optional
  }

  await service.createRestockSubscriptions({
    email: normalisedEmail,
    variant_id,
    variant_title,
    product_title,
  })

  return res.status(201).json({ success: true })
}
