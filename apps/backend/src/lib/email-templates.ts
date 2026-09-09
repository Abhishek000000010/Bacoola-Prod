/**
 * HTML builders for the order-confirmation emails.
 *
 * Kept dependency-free and inline-styled on purpose: email clients strip
 * <style> blocks and external CSS, so every style has to live on the element.
 * Medusa v2 stores monetary amounts as decimal MAJOR units (e.g. 1499.00, not
 * paise), so we format them directly with Intl — no /100 division.
 */

const BRAND = process.env.EMAIL_BRAND_NAME || "Bacoola"

type OrderLike = {
  id: string
  display_id?: number
  email?: string
  currency_code?: string
  created_at?: string | Date
  /** Gross, before discounts — the figure a "Subtotal" line must show. */
  item_subtotal?: number
  /** Net of discounts. Never label this "Subtotal". */
  item_total?: number
  shipping_total?: number
  tax_total?: number
  discount_total?: number
  total?: number
  items?: Array<{
    title?: string
    product_title?: string
    variant_title?: string
    quantity?: number
    unit_price?: number
    total?: number
  }>
  shipping_address?: {
    first_name?: string
    last_name?: string
    address_1?: string
    address_2?: string
    city?: string
    province?: string
    postal_code?: string
    country_code?: string
    phone?: string
  } | null
}

/**
 * Coerce a Medusa monetary/quantity field to a plain number.
 *
 * These fields are NOT plain numbers off the query — they are `BigNumber`
 * instances (expose `.numeric`) or their raw form `{ value, precision }`
 * (expose `.value`). `Number(bigNumberObject)` yields NaN, which is exactly how
 * the first version rendered ₹0.00 / qty 0. Handle every shape and fall back
 * safely so a weird value can never crash an email.
 */
export function toNum(v: unknown, fallback = 0): number {
  if (v == null) return fallback
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  if (typeof v === "object") {
    const anyV = v as any
    const cand =
      anyV.numeric ??
      anyV.value ??
      (typeof anyV.valueOf === "function" ? anyV.valueOf() : undefined)
    const n = Number(cand)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function money(amount: unknown, currency: string | undefined): string {
  const value = toNum(amount)
  const code = (currency || "INR").toUpperCase()
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
    }).format(value)
  } catch {
    // Unknown currency code — fall back to a plain number with the code.
    return `${code} ${value.toFixed(2)}`
  }
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function orderNumber(order: OrderLike): string {
  return order.display_id != null ? `#${order.display_id}` : order.id
}

function itemsTable(order: OrderLike): string {
  const rows = (order.items ?? [])
    .map((item) => {
      const name = esc(item.product_title || item.title || "Item")
      const variant = item.variant_title ? `<div style="color:#888;font-size:12px">${esc(item.variant_title)}</div>` : ""
      const qty =
        toNum(item.quantity) ||
        toNum((item as any).raw_quantity) ||
        toNum((item as any).detail?.quantity)
      const lineTotal = money(
        toNum(item.total) || toNum(item.unit_price) * qty,
        order.currency_code
      )
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${name}${variant}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${qty}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${lineTotal}</td>
        </tr>`
    })
    .join("")

  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="color:#888;font-size:12px;text-transform:uppercase">
          <th style="text-align:left;padding-bottom:6px">Item</th>
          <th style="text-align:center;padding-bottom:6px">Qty</th>
          <th style="text-align:right;padding-bottom:6px">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function totalsBlock(order: OrderLike): string {
  const c = order.currency_code
  const row = (label: string, amount: number, bold = false) => {
    const weight = bold ? "font-weight:700;font-size:16px" : ""
    return `<tr>
      <td style="padding:4px 0;text-align:right;color:#555;${weight}">${label}</td>
      <td style="padding:4px 0;text-align:right;width:120px;${weight}">${money(amount, c)}</td>
    </tr>`
  }
  const discount = toNum(order.discount_total)
  const tax = toNum(order.tax_total)
  // `item_total` is ALREADY NET of discounts. Showing it as "Subtotal" next to a
  // separate discount line subtracts the discount twice on the face of the
  // email: order #57 read 2890 - 1000 + 99 against a stated total of 2989. The
  // gross figure is `item_subtotal`; fall back to the net one only when the
  // query did not ask for it, in which case there is no discount row either.
  const grossItems = toNum(order.item_subtotal) || toNum(order.item_total) + discount
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
      ${row("Subtotal", grossItems)}
      ${discount ? row("Discount", -Math.abs(discount)) : ""}
      ${row("Shipping", toNum(order.shipping_total))}
      ${tax ? row("Tax", tax) : ""}
      ${row("Total", toNum(order.total), true)}
    </table>`
}

function addressBlock(order: OrderLike): string {
  const a = order.shipping_address
  if (!a) return ""
  const line = (s?: string) => (s ? `${esc(s)}<br>` : "")
  const name = [a.first_name, a.last_name].filter(Boolean).join(" ")
  const cityLine = [a.city, a.province, a.postal_code].filter(Boolean).join(", ")
  return `
    <div style="margin-top:20px;font-size:14px;color:#333">
      <div style="color:#888;font-size:12px;text-transform:uppercase;margin-bottom:6px">Shipping to</div>
      ${line(name)}
      ${line(a.address_1)}
      ${line(a.address_2)}
      ${line(cityLine)}
      ${line(a.country_code ? a.country_code.toUpperCase() : undefined)}
      ${line(a.phone)}
    </div>`
}

function shell(title: string, inner: string): string {
  return `
  <div style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif;color:#222">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
      <div style="background:#111;color:#fff;padding:20px 28px;font-size:18px;font-weight:700">${esc(BRAND)}</div>
      <div style="padding:28px">
        ${inner}
      </div>
      <div style="padding:18px 28px;background:#fafafa;color:#999;font-size:12px;text-align:center">
        ${esc(title)} · ${esc(BRAND)}
      </div>
    </div>
  </div>`
}

/** Customer-facing "thanks, we got your order" email. */
export function buildCustomerOrderEmail(order: OrderLike): { subject: string; html: string } {
  const num = orderNumber(order)
  const firstName = order.shipping_address?.first_name
  const greeting = firstName ? `Hi ${esc(firstName)},` : "Hi there,"

  const inner = `
    <h1 style="font-size:20px;margin:0 0 12px">Thank you for your order!</h1>
    <p style="font-size:14px;color:#555;margin:0 0 4px">${greeting}</p>
    <p style="font-size:14px;color:#555;margin:0 0 20px">
      We've received your order <strong>${esc(num)}</strong> and your payment was successful.
      We'll send another note when it ships.
    </p>
    <p style="font-size:14px;color:#555;margin:0 0 20px">
      Your invoice is attached to this email as a PDF.
    </p>
    ${itemsTable(order)}
    ${totalsBlock(order)}
    ${addressBlock(order)}
  `
  return {
    subject: `${BRAND} — Order ${num} confirmed`,
    html: shell("Order confirmation", inner),
  }
}

/** "It's back!" email for a restocked variant a shopper asked to be told about. */
export function buildRestockEmail(input: {
  productTitle?: string | null
  variantTitle?: string | null
  productUrl?: string | null
}): { subject: string; html: string } {
  const name = esc(input.productTitle || "An item on your list")
  const variant = input.variantTitle
    ? `<p style="font-size:14px;color:#555;margin:0 0 20px">Option: <strong>${esc(
        input.variantTitle
      )}</strong></p>`
    : ""
  const cta = input.productUrl
    ? `<a href="${esc(input.productUrl)}" style="display:inline-block;margin-top:8px;background:#111;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px">Shop now</a>`
    : ""

  const inner = `
    <h1 style="font-size:20px;margin:0 0 12px">Good news — it's back in stock!</h1>
    <p style="font-size:14px;color:#555;margin:0 0 4px">
      <strong>${name}</strong> is available again.
    </p>
    ${variant}
    <p style="font-size:13px;color:#888;margin:0 0 16px">
      Popular sizes sell out quickly, so grab it while you can.
    </p>
    ${cta}
  `
  return {
    subject: `${BRAND} — "${input.productTitle || "Your item"}" is back in stock`,
    html: shell("Back in stock", inner),
  }
}

/** Store-owner notification of a new paid order. */
export function buildAdminOrderEmail(order: OrderLike): { subject: string; html: string } {
  const num = orderNumber(order)
  const customer = order.email ? esc(order.email) : "unknown"
  const placed = order.created_at ? new Date(order.created_at).toLocaleString("en-IN") : ""

  const inner = `
    <h1 style="font-size:20px;margin:0 0 12px">New order ${esc(num)}</h1>
    <p style="font-size:14px;color:#555;margin:0 0 4px">Customer: <strong>${customer}</strong></p>
    ${placed ? `<p style="font-size:14px;color:#555;margin:0 0 20px">Placed: ${esc(placed)}</p>` : ""}
    ${itemsTable(order)}
    ${totalsBlock(order)}
    ${addressBlock(order)}
  `
  return {
    subject: `New order ${num} — ${money(order.total, order.currency_code)}`,
    html: shell("New order notification", inner),
  }
}

/**
 * Admin password-reset email.
 *
 * The link carries a single-use JWT that Medusa mints with a 15-minute TTL
 * (RESET_PASSWORD_TOKEN_TTL_SECONDS in @medusajs/core-flows). The admin's
 * reset page decodes the account out of the token itself, so the address is
 * deliberately NOT in the URL — one less thing leaking through browser history,
 * referrers or shoulder-surfing.
 */
export function buildAdminPasswordResetEmail(input: {
  resetUrl: string
  expiresInMinutes: number
}): { subject: string; html: string } {
  const inner = `
    <h1 style="font-size:20px;margin:0 0 12px">Reset your admin password</h1>
    <p style="font-size:14px;color:#555;margin:0 0 20px">
      Someone asked to reset the password for your ${esc(BRAND)} admin account.
      Click below to choose a new one.
    </p>
    <p style="margin:0 0 24px">
      <a href="${esc(input.resetUrl)}"
         style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-size:14px;font-weight:700">
        Set a new password
      </a>
    </p>
    <p style="font-size:13px;color:#777;margin:0 0 8px">
      This link expires in ${input.expiresInMinutes} minutes and can only be used once.
    </p>
    <p style="font-size:13px;color:#777;margin:0 0 20px">
      If you didn't ask for this, ignore this email — your password stays as it is.
    </p>
    <p style="font-size:12px;color:#aaa;margin:0;word-break:break-all">
      If the button doesn't work, paste this into your browser:<br>${esc(input.resetUrl)}
    </p>
  `
  return {
    subject: `${BRAND} — reset your admin password`,
    html: shell("Password reset", inner),
  }
}
