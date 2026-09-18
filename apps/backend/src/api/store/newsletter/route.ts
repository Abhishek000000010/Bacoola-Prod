import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { subscribe } from "../../../lib/newsletter"

const schema = z.object({
  email: z.string().trim().email().max(254),
  source: z.enum(["footer"]).optional(),
})

/**
 * POST /store/newsletter
 * Body: { email, source? }
 *
 * Public newsletter sign-up (the footer form). Idempotent per address: an
 * already-active subscriber gets `already_subscribed` and no second welcome
 * email; an address that previously unsubscribed is reactivated.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: "Please enter a valid email address." })
  }

  const status = await subscribe(req.scope, {
    email: parsed.data.email,
    source: parsed.data.source ?? "footer",
  })

  return res.status(status === "subscribed" ? 201 : 200).json({ status })
}
