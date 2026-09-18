import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "../lib/email"
import { buildCustomerPasswordResetEmail } from "../lib/email-templates"

/**
 * Send the storefront "forgotten your password?" email.
 *
 * Mirrors admin-password-reset-email.ts, but for actor_type "customer": the
 * storefront calls `sdk.auth.resetPassword("customer", "emailpass", ...)`,
 * Medusa mints a single-use JWT and emits `auth.password_reset`, and this
 * listener turns that into mail. Medusa only ever emits the event for an
 * email that actually has a customer identity, so there's no allowlist here
 * (unlike the admin handler) — the storefront's forgot-password form always
 * shows the same "check your inbox" message either way, so this can't be
 * used to discover which addresses have accounts.
 *
 * The reset page (storefront /reset-password) reads `token` from the query
 * string and calls `sdk.auth.updateProvider("customer", "emailpass", { password }, token)`,
 * which decodes the account out of the token itself — so the address is
 * deliberately NOT in the URL.
 */

// Medusa mints reset tokens with a 15-minute TTL
// (RESET_PASSWORD_TOKEN_TTL_SECONDS in @medusajs/core-flows). Kept here only
// so the email can tell the customer how long they have; changing it does
// not change the actual expiry.
const TOKEN_TTL_MINUTES = 15

type PasswordResetEvent = {
  entity_id: string
  actor_type: string
  token: string
}

/** Where the storefront is served from, e.g. https://bacoola.com/in */
function storefrontBaseUrl(): string | undefined {
  const explicit = process.env.STOREFRONT_URL?.trim()
  return explicit ? explicit.replace(/\/+$/, "") : undefined
}

export default async function customerPasswordResetEmailHandler({
  event,
  container,
}: SubscriberArgs<PasswordResetEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { entity_id: email, actor_type: actorType, token } = event.data ?? ({} as PasswordResetEvent)

  if (actorType !== "customer") {
    // Admin reset — not this handler's job.
    return
  }

  if (!email || !token) {
    logger.warn(
      "[customer-password-reset] event missing entity_id or token; nothing sent"
    )
    return
  }

  const base = storefrontBaseUrl()

  if (!base) {
    logger.error(
      "[customer-password-reset] STOREFRONT_URL is not set, so the reset " +
        "link cannot be built; no email sent"
    )
    return
  }

  const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`
  const { subject, html } = buildCustomerPasswordResetEmail({
    resetUrl,
    expiresInMinutes: TOKEN_TTL_MINUTES,
  })

  // sendEmail never throws — a mail failure must not bubble into the auth
  // workflow, which has already minted the token by this point.
  await sendEmail(logger, { to: email, subject, html })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
