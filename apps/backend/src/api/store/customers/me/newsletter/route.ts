import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import {
  findByEmail,
  NEWSLETTER_INTERESTS,
  newToken,
  serviceFrom,
  subscribe,
  unsubscribeRow,
} from "../../../../../lib/newsletter"

/**
 * The logged-in customer's newsletter preferences (My subscriptions).
 * Authentication comes from Medusa's own `/store/customers/me*` middleware.
 */

async function customerEmail(req: AuthenticatedMedusaRequest) {
  const customerId = req.auth_context.actor_id
  const customer = await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(customerId)
  return { customerId, email: customer.email as string }
}

/** GET /store/customers/me/newsletter -> { subscribed, interests } */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { customerId, email } = await customerEmail(req)
  const service = serviceFrom(req.scope)

  const [byCustomer] = await service.listNewsletterSubscribers({ customer_id: customerId })
  const row = byCustomer ?? (email ? await findByEmail(service, email) : undefined)

  return res.json({
    subscribed: row?.status === "subscribed",
    interests: Array.isArray(row?.interests) ? row.interests : [],
  })
}

const schema = z.object({
  subscribed: z.boolean(),
  interests: z.array(z.enum(NEWSLETTER_INTERESTS)).default([]),
})

/** POST /store/customers/me/newsletter  Body: { subscribed, interests } */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid preferences." })
  }

  const { customerId, email } = await customerEmail(req)
  if (!email) return res.status(400).json({ error: "Your account has no email address." })

  const service = serviceFrom(req.scope)
  const { subscribed, interests } = parsed.data

  if (subscribed) {
    await subscribe(req.scope, { email, source: "account", customer_id: customerId, interests })
  } else {
    const row = await findByEmail(service, email)
    if (row) {
      await service.updateNewsletterSubscribers({ id: row.id, interests: interests as any, customer_id: customerId })
      await unsubscribeRow(service, row)
    } else {
      // No subscriber row yet: create one so the chosen "Contents" interests
      // are saved even though the account has never subscribed by e-mail.
      await service.createNewsletterSubscribers({
        email,
        status: "unsubscribed",
        source: "account",
        customer_id: customerId,
        interests: interests as any,
        unsubscribe_token: newToken(),
      })
    }
  }

  return res.json({ subscribed, interests })
}
