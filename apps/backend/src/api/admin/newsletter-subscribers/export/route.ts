import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { serviceFrom } from "../../../../lib/newsletter"

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v)
  // Quote everything; neutralise spreadsheet formula injection (=, +, -, @).
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

/**
 * GET /admin/newsletter-subscribers/export?status=
 * CSV of subscribers (default: only active ones), for importing into an email
 * tool. Includes each row's unsubscribe token so that tool can build links.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const status = (req.query.status as string) || "subscribed"
  const filters = status === "all" ? {} : { status }

  const rows = await serviceFrom(req.scope).listNewsletterSubscribers(filters, {
    order: { created_at: "DESC" },
  })

  const header = ["email", "status", "source", "interests", "subscribed_at", "unsubscribed_at", "unsubscribe_token"]
  const lines = rows.map((r: any) =>
    [
      r.email,
      r.status,
      r.source,
      Array.isArray(r.interests) ? r.interests.join(" ") : "",
      r.subscribed_at,
      r.unsubscribed_at,
      r.unsubscribe_token,
    ]
      .map(cell)
      .join(",")
  )

  const date = new Date().toISOString().slice(0, 10)
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="newsletter-subscribers-${date}.csv"`)
  return res.send([header.join(","), ...lines].join("\n"))
}
