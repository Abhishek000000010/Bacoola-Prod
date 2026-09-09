/**
 * The seller block printed on the invoice.
 *
 * These are the same business facts the storefront's legal pages state
 * (apps/storefront/src/lib/legal-config.ts). They are duplicated here rather
 * than imported because the backend and the storefront are separate deployables
 * with no shared package — the backend cannot reach into the Next.js app's
 * source tree at runtime.
 *
 * The `null` convention is carried over deliberately and it matters MORE here
 * than on a web page: an invoice is a document the customer keeps, forwards to
 * an accountant, and may claim input credit against. A GSTIN that is not yet
 * issued must be ABSENT from the document, never a placeholder, never an empty
 * "GSTIN:" label. Every field below is therefore skipped entirely when null, so
 * an invoice printed before registration is simply a receipt — accurate but
 * incomplete — rather than a document making a tax claim the business cannot
 * back.
 *
 * Anything can be overridden by env without a code change, which is how the
 * GSTIN and CIN are expected to arrive once they are issued:
 *   INVOICE_SELLER_NAME, INVOICE_SELLER_GSTIN, INVOICE_SELLER_CIN,
 *   INVOICE_SELLER_PAN, INVOICE_SELLER_ADDRESS (newline- or "|"-separated),
 *   INVOICE_SELLER_EMAIL, INVOICE_SELLER_PHONE, INVOICE_SELLER_STATE,
 *   INVOICE_SELLER_STATE_CODE, INVOICE_SUPPORT_URL, INVOICE_DEFAULT_HSN
 */

/** A fact the business must supply. `null` until it does — never printed. */
export type LegalFact = string | null

const env = (key: string): LegalFact => {
  const v = process.env[key]?.trim()
  return v ? v : null
}

/** Split a multi-line env value written on one line: "A|B|C" or with \n. */
const envLines = (key: string): string[] | null => {
  const v = env(key)
  if (!v) return null
  const lines = v
    .split(/\r?\n|\|/)
    .map((l) => l.trim())
    .filter(Boolean)
  return lines.length ? lines : null
}

export type SellerInfo = {
  brand: string
  entityName: string
  addressLines: string[]
  state: string
  stateCode: LegalFact
  postalCode: string
  country: string
  email: LegalFact
  phone: LegalFact
  gstin: LegalFact
  cin: LegalFact
  pan: LegalFact
  supportUrl: LegalFact
  /**
   * Fallback HSN for apparel, printed per line item when a product carries no
   * HSN of its own. Null until the business states it — an HSN is a tax
   * classification, and guessing one on a document the customer files is worse
   * than omitting the column.
   */
  defaultHsn: LegalFact
  /**
   * Combined GST rate as a percentage (5, 12, 18 …), used ONLY when the order
   * itself carries no tax lines, in which case the listed prices are treated as
   * GST-inclusive and the tax is backed out of them for disclosure.
   *
   * Null means "say nothing about GST", which is correct until somebody
   * confirms the rate. The right long-term fix is configuring tax rates in
   * Medusa so the order carries real tax lines; this exists because an Indian
   * apparel invoice is expected to disclose the split of an inclusive price,
   * and a blank where the tax should be looks like an error to the customer.
   */
  gstRate: number | null
  /** SAC for the delivery charge, shown as its own row in the tax summary. */
  shippingSac: LegalFact
  /** Printed above the signature block. */
  declaration: string
  /** Who signs. Conventionally the entity name. */
  signatory: string
  /** Free-text notes box at the foot of the invoice. */
  notes: string[]
  /** Numbered terms box at the foot of the invoice. */
  terms: string[]
}

export function getSellerInfo(): SellerInfo {
  return {
    brand: process.env.EMAIL_BRAND_NAME || "Bacoola",
    entityName: env("INVOICE_SELLER_NAME") || "Bacoola",
    addressLines: envLines("INVOICE_SELLER_ADDRESS") || [
      "Centura Square, IT Park",
      "7th Floor, Road Number 27",
      "Wagle Industrial Estate",
      "Thane West, Thane",
    ],
    state: process.env.INVOICE_SELLER_STATE?.trim() || "Maharashtra",
    stateCode: env("INVOICE_SELLER_STATE_CODE"),
    postalCode: process.env.INVOICE_SELLER_POSTAL_CODE?.trim() || "400604",
    country: process.env.INVOICE_SELLER_COUNTRY?.trim() || "India",
    email: env("INVOICE_SELLER_EMAIL") || "yash.mishra@datacircles.in",
    phone: env("INVOICE_SELLER_PHONE") || "+91 88794 38577",
    // Not yet issued — see legal-config.ts. Supply via env when they are.
    gstin: env("INVOICE_SELLER_GSTIN"),
    cin: env("INVOICE_SELLER_CIN"),
    pan: env("INVOICE_SELLER_PAN"),
    // A localhost storefront URL is filtered out rather than printed: it is a
    // dead link on a document the customer keeps, and it tells them the invoice
    // came off somebody's laptop.
    supportUrl: publicUrl(env("INVOICE_SUPPORT_URL") || env("STOREFRONT_URL")),
    defaultHsn: env("INVOICE_DEFAULT_HSN"),
    gstRate: envNumber("INVOICE_GST_RATE"),
    shippingSac: env("INVOICE_SHIPPING_SAC"),
    notes: envLines("INVOICE_NOTES") || [
      "Issued against an order already paid in full. No amount is due.",
    ],
    // Numbered on the page, so no numbering here. Kept SHORT on two counts:
    // terms that contradict the published policies are worse than no terms at
    // all, so these point at those policies rather than restating them; and the
    // block has to fit beneath the tax summary or it pushes a one-page invoice
    // onto a second page carrying nothing but boilerplate.
    terms: envLines("INVOICE_TERMS") || [
      "Returns accepted within 15 days of delivery, per our Refund and Cancellation Policy.",
      "Items must be unused and returned with original tags and packaging.",
      "Refunds are issued to the original payment method after inspection.",
      "Report any damage or shortage within 48 hours of delivery.",
      "Disputes are subject to the jurisdiction of courts at Thane, Maharashtra.",
    ],
    declaration:
      process.env.INVOICE_DECLARATION?.trim() ||
      "We declare that this invoice shows the actual price of the goods described " +
        "and that all particulars are true and correct.",
    signatory: env("INVOICE_SIGNATORY") || env("INVOICE_SELLER_NAME") || "Bacoola",
  }
}

const envNumber = (key: string): number | null => {
  const v = env(key)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * A URL fit to print: hostname only, and nothing that points at a dev machine.
 */
function publicUrl(value: LegalFact): LegalFact {
  if (!value) return null
  try {
    const host = new URL(value).hostname
    if (/^(localhost|127\.|0\.0\.0\.0|\[?::1)/.test(host)) return null
    return host.replace(/^www\./, "")
  } catch {
    return /localhost|127\.0\.0\.1/.test(value) ? null : value
  }
}
