import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { serviceFrom } from "../../../lib/newsletter"

/**
 * GET /admin/newsletter-subscribers?q=&status=&limit=&offset=
 * Newest first. `q` matches the email; `status` is subscribed | unsubscribed.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { q, status } = req.query as Record<string, string | undefined>
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  const filters: Record<string, unknown> = {}
  if (status === "subscribed" || status === "unsubscribed") filters.status = status
  if (q?.trim()) filters.q = q.trim()

  const [subscribers, count] = await serviceFrom(req.scope).listAndCountNewsletterSubscribers(
    filters,
    { take: limit, skip: offset, order: { created_at: "DESC" } }
  )

  const [, activeCount] = await serviceFrom(req.scope).listAndCountNewsletterSubscribers(
    { status: "subscribed" },
    { take: 1 }
  )

  return res.json({ subscribers, count, active_count: activeCount, limit, offset })
}
