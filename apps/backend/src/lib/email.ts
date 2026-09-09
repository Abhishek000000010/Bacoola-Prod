import sgMail from "@sendgrid/mail"

/**
 * Thin wrapper around SendGrid used by the order-confirmation subscriber.
 *
 * Design goals:
 *  - NEVER throw into a caller. Email is a side effect of checkout; a SendGrid
 *    outage or a missing key must not fail an order that has already been paid
 *    for. Every failure is logged and swallowed.
 *  - Fail *quietly and clearly* when unconfigured. If SENDGRID_API_KEY or
 *    SENDGRID_FROM_EMAIL is missing we log once and no-op, so the server still
 *    boots and checkout still works before email is set up (same philosophy as
 *    the optional Cloudinary/Redis config elsewhere).
 *
 * Config (all via env — never hardcode):
 *   SENDGRID_API_KEY         API key from SendGrid → Settings → API Keys.
 *   SENDGRID_FROM_EMAIL      Verified sender address (Single Sender or a
 *                            verified domain). SendGrid silently drops mail
 *                            from an unverified "from" address.
 *   SENDGRID_FROM_NAME       Optional display name shown to recipients.
 */

type Logger = { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void }

/**
 * One file to hang off the message.
 *
 * `content` is raw bytes; the base64 encoding SendGrid's API requires happens
 * in sendEmail(), so no caller has to remember it. Keep attachments small —
 * SendGrid caps a whole message at 30 MB *after* base64 expansion (~22 MB of
 * real bytes), and mailbox providers reject well below that.
 */
export type EmailAttachment = {
  filename: string
  content: Buffer
  /** MIME type, e.g. "application/pdf". */
  contentType: string
}

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

let configured = false

function ensureConfigured(logger: Logger): boolean {
  const apiKey = process.env.SENDGRID_API_KEY
  const from = process.env.SENDGRID_FROM_EMAIL

  if (!apiKey || !from) {
    logger.warn(
      "[email] SendGrid is not configured (missing SENDGRID_API_KEY and/or " +
        "SENDGRID_FROM_EMAIL). Skipping email send. Set both in .env to enable."
    )
    return false
  }

  if (!configured) {
    sgMail.setApiKey(apiKey)
    configured = true
  }
  return true
}

/**
 * Send one email. Returns true if handed off to SendGrid, false if skipped or
 * failed. Never throws.
 */
export async function sendEmail(logger: Logger, input: SendEmailInput): Promise<boolean> {
  if (!ensureConfigured(logger)) return false

  const from = process.env.SENDGRID_FROM_EMAIL as string
  const fromName = process.env.SENDGRID_FROM_NAME

  try {
    await sgMail.send({
      to: input.to,
      from: fromName ? { email: from, name: fromName } : from,
      subject: input.subject,
      html: input.html,
      // SendGrid recommends a plain-text part too; fall back to a stripped body.
      text: input.text ?? input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        type: a.contentType,
        content: a.content.toString("base64"),
        disposition: "attachment",
      })),
    })
    const recipients = Array.isArray(input.to) ? input.to.join(", ") : input.to
    const files = input.attachments?.length
      ? ` with ${input.attachments.map((a) => a.filename).join(", ")}`
      : ""
    logger.info(`[email] sent "${input.subject}" to ${recipients}${files}`)
    return true
  } catch (err: any) {
    // SendGrid returns useful detail on err.response.body; surface it.
    const detail = err?.response?.body ? JSON.stringify(err.response.body) : err?.message
    logger.error(`[email] failed to send "${input.subject}": ${detail}`)
    return false
  }
}
