import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "../lib/email"
import { buildAdminPasswordResetEmail } from "../lib/email-templates"

/**
 * Send the admin "forgot password" email.
 *
 * Medusa already does everything except this. When someone submits the admin
 * login page's forgot-password form, the backend mints a single-use JWT and
 * emits `auth.password_reset` — and then stops, because it has no idea how this
 * project sends mail. Without a listener the event goes nowhere and the user
 * waits for an email that never arrives.
 *
 * The reset page (@medusajs/dashboard) reads `token` from the query string and
 * decodes the account out of the token itself, so the link needs nothing else.
 * The address is deliberately NOT a query parameter: it would otherwise sit in
 * browser history and referrer headers for no benefit.
 *
 * ── Who is allowed to receive one ──────────────────────────────────────────
 * ADMIN_PASSWORD_RESET_EMAILS is an explicit allowlist. Only those addresses
 * get a reset email; a request for any other account is logged and dropped.
 *
 * To be clear about what this does and does not protect against: Medusa only
 * ever mails the address ON the account, so a stranger typing their own email
 * into the form already receives nothing. The allowlist is a second, narrower
 * gate — it means that even if another admin account is created later, it
 * cannot self-serve a password reset unless someone deliberately adds it here.
 * What neither can protect against is an attacker who can read an admin's
 * inbox; that is true of every password reset anywhere, and the defence is the
 * inbox itself.
 *
 * Unset the variable and NOBODY can reset by email — it fails closed on
 * purpose. Recovery then goes through the server:
 *   docker exec bacoola-backend npx medusa user -e <email> -p <new-password>
 *
 * Customer (storefront) resets emit the same event with actor_type "customer";
 * they are ignored here rather than silently borrowing the admin template.
 */

// Medusa mints reset tokens with a 15-minute TTL
// (RESET_PASSWORD_TOKEN_TTL_SECONDS in @medusajs/core-flows). Kept here only so
// the email can tell the user how long they have; changing it does not change
// the actual expiry.
const TOKEN_TTL_MINUTES = 15

type PasswordResetEvent = {
  entity_id: string
  actor_type: string
  token: string
}

function allowlist(): string[] {
  return (process.env.ADMIN_PASSWORD_RESET_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Where the admin dashboard is served from, e.g. https://api.bacoola.com */
function adminBaseUrl(): string | undefined {
  const explicit = process.env.ADMIN_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, "")

  // Fall back to the first ADMIN_CORS origin so this keeps working in
  // environments that never set ADMIN_URL (local dev, for one).
  const fromCors = process.env.ADMIN_CORS?.split(",")[0]?.trim()
  return fromCors ? fromCors.replace(/\/+$/, "") : undefined
}

export default async function adminPasswordResetEmailHandler({
  event,
  container,
}: SubscriberArgs<PasswordResetEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { entity_id: email, actor_type: actorType, token } = event.data ?? ({} as PasswordResetEvent)

  if (actorType !== "user") {
    // Storefront customer reset — not this handler's job.
    return
  }

  if (!email || !token) {
    logger.warn(
      "[admin-password-reset] event missing entity_id or token; nothing sent"
    )
    return
  }

  const allowed = allowlist()

  if (!allowed.length) {
    logger.warn(
      "[admin-password-reset] ADMIN_PASSWORD_RESET_EMAILS is not set, so no " +
        "admin can reset by email. Set it, or reset on the server with " +
        "`npx medusa user -e <email> -p <password>`."
    )
    return
  }

  if (!allowed.includes(email.toLowerCase())) {
    // Logged rather than silent: a reset attempt for a non-allowlisted admin is
    // worth seeing. The person on the login page is told nothing either way —
    // the admin UI always shows the same "if that account exists" message, so
    // this cannot be used to discover which addresses have accounts.
    logger.warn(
      `[admin-password-reset] reset requested for ${email}, which is not in ` +
        "ADMIN_PASSWORD_RESET_EMAILS — no email sent"
    )
    return
  }

  const base = adminBaseUrl()

  if (!base) {
    logger.error(
      "[admin-password-reset] neither ADMIN_URL nor ADMIN_CORS is set, so the " +
        "reset link cannot be built; no email sent"
    )
    return
  }

  const resetUrl = `${base}/app/reset-password?token=${encodeURIComponent(token)}`
  const { subject, html } = buildAdminPasswordResetEmail({
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
