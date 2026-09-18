import { randomBytes } from "crypto"
import { NEWSLETTER_MODULE } from "../modules/newsletter"
import type { NewsletterService } from "../modules/newsletter/service"
import { sendEmail } from "./email"
import { buildNewsletterWelcomeEmail } from "./email-templates"

type Logger = { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }
type Scope = { resolve: (key: string) => any }

export const NEWSLETTER_INTERESTS = ["women", "men", "teen", "kids"] as const
export type NewsletterInterest = (typeof NEWSLETTER_INTERESTS)[number]

export const normaliseEmail = (email: string) => email.trim().toLowerCase()

export const newToken = () => randomBytes(24).toString("hex")

const storefrontUrl = () => (process.env.STOREFRONT_URL || "").replace(/\/+$/, "")

/** The page that performs the unsubscribe; STOREFRONT_URL already carries /in. */
export const unsubscribeUrl = (token: string) =>
  `${storefrontUrl()}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`

export const serviceFrom = (scope: Scope): NewsletterService =>
  scope.resolve(NEWSLETTER_MODULE)

export async function findByEmail(service: NewsletterService, email: string) {
  const [row] = await service.listNewsletterSubscribers({ email: normaliseEmail(email) })
  return row
}

/**
 * Subscribes an address, creating or reactivating its row.
 *
 * Returns "already_subscribed" without touching anything (or re-sending the
 * welcome email) when the address is already active, except that a customer
 * link or interests passed in are still recorded.
 */
export async function subscribe(
  scope: Scope,
  input: {
    email: string
    source?: string
    customer_id?: string
    interests?: NewsletterInterest[]
  }
): Promise<"subscribed" | "already_subscribed"> {
  const service = serviceFrom(scope)
  const logger: Logger = scope.resolve("logger")
  const email = normaliseEmail(input.email)
  const existing = await findByEmail(service, email)
  const now = new Date()

  if (existing?.status === "subscribed") {
    const patch: Record<string, unknown> = {}
    if (input.customer_id && existing.customer_id !== input.customer_id) patch.customer_id = input.customer_id
    if (input.interests) patch.interests = input.interests
    if (Object.keys(patch).length) {
      await service.updateNewsletterSubscribers({ id: existing.id, ...patch })
    }
    return "already_subscribed"
  }

  const row = existing
    ? await service.updateNewsletterSubscribers({
        id: existing.id,
        status: "subscribed",
        source: input.source ?? existing.source,
        customer_id: input.customer_id ?? existing.customer_id,
        // A JSON column is typed as an object; the stored value is a string list.
        interests: (input.interests ?? existing.interests) as any,
        subscribed_at: now,
        unsubscribed_at: null,
      })
    : await service.createNewsletterSubscribers({
        email,
        status: "subscribed",
        source: input.source ?? null,
        customer_id: input.customer_id ?? null,
        interests: (input.interests ?? null) as any,
        unsubscribe_token: newToken(),
        subscribed_at: now,
      })

  // Best-effort: a failed or unconfigured email never fails the sign-up.
  const link = unsubscribeUrl(row.unsubscribe_token)
  const { subject, html } = buildNewsletterWelcomeEmail({
    shopUrl: storefrontUrl() || null,
    unsubscribeUrl: link,
  })
  await sendEmail(logger, {
    to: email,
    subject,
    html,
    headers: { "List-Unsubscribe": `<${link}>` },
  })

  return "subscribed"
}

export async function unsubscribeRow(service: NewsletterService, row: { id: string; status: string }) {
  if (row.status === "unsubscribed") return
  await service.updateNewsletterSubscribers({
    id: row.id,
    status: "unsubscribed",
    unsubscribed_at: new Date(),
  })
}
