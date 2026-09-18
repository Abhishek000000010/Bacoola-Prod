import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { serviceFrom, unsubscribeRow } from "../../../../lib/newsletter"

const schema = z.object({ token: z.string().min(16).max(128) })

/**
 * POST /store/newsletter/unsubscribe
 * Body: { token }
 *
 * Called by the storefront's /newsletter/unsubscribe page with the token from
 * an email link. POST rather than GET so mail scanners that pre-fetch links
 * can't unsubscribe people. Unknown tokens get a 404; repeat calls are no-ops.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid unsubscribe link." })
  }

  const service = serviceFrom(req.scope)
  const [row] = await service.listNewsletterSubscribers({
    unsubscribe_token: parsed.data.token,
  })
  if (!row) {
    return res.status(404).json({ error: "This unsubscribe link is not valid." })
  }

  await unsubscribeRow(service, row)
  return res.status(200).json({ status: "unsubscribed", email: row.email })
}
