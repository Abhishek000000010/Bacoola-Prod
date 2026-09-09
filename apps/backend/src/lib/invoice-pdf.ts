import PDFDocument from "pdfkit"
import fontkit from "fontkit"
import {
  BACOOLA_LOGO,
  MANGO_REGULAR,
  MANGO_SEMIBOLD,
  POPPINS_REGULAR,
} from "./invoice-assets"
import { getSellerInfo, type SellerInfo } from "./seller-info"
import { toNum } from "./email-templates"
import { extractInclusiveTax, placeOfSupply, round2, splitGst, stateCode } from "./india-gst"

/**
 * The order invoice, as a PDF.
 *
 * -- Layout -----------------------------------------------------------------
 * A ruled grid, in the shape a GST tax invoice is conventionally printed in:
 * seller and invoice meta boxed at the top, customer and delivery below it,
 * then a bordered line-item table carrying per-line taxable value and tax, a
 * totals stack, the amount in words, an HSN-wise tax summary, and notes/terms.
 * The masthead above it -- wordmark left, small letterspaced label right -- and
 * the greyscale palette are deliberately untouched.
 *
 * -- Typography -------------------------------------------------------------
 * The brand face is MangoNew, the same one the storefront sets on everything
 * (apps/storefront/src/styles/globals.css). It ships as an "-en" SUBSET: 210
 * glyphs covering ASCII plus a little punctuation. It has no rupee sign
 * (U+20B9), no accented Latin and no Indic. A PDF cannot silently fall back the
 * way a browser does -- pdfkit draws a missing glyph as .notdef, so an invoice
 * set entirely in Mango would print every amount as a tofu box followed by the
 * digits. fontFor() therefore checks each string against Mango's character set
 * and falls back to Poppins per STRING, so a product title with one accent
 * renders in one consistent face instead of switching mid-word.
 *
 * -- Money ------------------------------------------------------------------
 * READ THIS BEFORE TOUCHING THE TOTALS. Medusa's `item_total` is ALREADY NET OF
 * DISCOUNTS. Printing it as "Subtotal" alongside a separate "Discount" line
 * subtracts the discount twice on the face of the document: order #57 read
 * 2890 - 1000 + 99 against a stated total of 2989. The gross figure is
 * `item_subtotal`, and the same holds per line: `items.subtotal` is gross,
 * `items.total` is net.
 *
 * Every displayed figure is derived so the page reconciles two ways -- across
 * the charge stack (subtotal - discount + shipping) and across the tax stack
 * (taxable + tax) -- and the taxable value is BACKED OUT of the grand total
 * rather than accumulated, so per-line rounding can never make the two columns
 * disagree by a paisa.
 *
 * -- Tax --------------------------------------------------------------------
 * If the order carries real tax lines they are used as-is. If it does not and a
 * GST rate is configured, listed prices are treated as GST-INCLUSIVE and the
 * tax is backed out for disclosure -- which changes nothing about what the
 * customer pays and is how Indian apparel is normally invoiced. With no tax and
 * no configured rate, every GST element disappears and the result is a plain
 * receipt. See seller-info.ts for why no tax number is ever invented.
 */

// -- Page geometry -----------------------------------------------------------
const PAGE = { width: 595.28, height: 841.89 } // A4, in points
const MARGIN = 44
const CONTENT_W = PAGE.width - MARGIN * 2
const BOTTOM = PAGE.height - MARGIN - 30

// -- Palette (unchanged: the greyscale reads as the brand) --------------------
const INK = "#111111"
const BODY = "#3F3F46"
const MUTED = "#8A8A93"
const GRID = "#D6D6DA"
const HAIRLINE = "#EAEAEC"
const TINT = "#F6F6F7"

const F = { brand: "Mango", brandBold: "MangoBold", body: "Poppins" } as const
type FontName = (typeof F)[keyof typeof F]

/** Mango's character set, read with pdfkit's own font parser. */
const mangoCoverage: Set<number> = (() => {
  try {
    const font = fontkit.create(MANGO_REGULAR()) as any
    return new Set<number>(font.characterSet ?? [])
  } catch {
    return new Set<number>()
  }
})()

function mangoCanDraw(s: string): boolean {
  if (!mangoCoverage.size) return false
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if (cp === 0x20 || cp === 0x0a || cp === 0x09) continue
    if (!mangoCoverage.has(cp)) return false
  }
  return true
}

function fontFor(s: string, bold: boolean): FontName {
  if (!mangoCanDraw(s)) return F.body
  return bold ? F.brandBold : F.brand
}

// -- Types -------------------------------------------------------------------

type Address = {
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  postal_code?: string
  country_code?: string
  phone?: string
} | null

export type InvoiceOrder = {
  id: string
  display_id?: number
  email?: string
  currency_code?: string
  created_at?: string | Date
  /** Gross, before discounts. THIS is the subtotal. */
  item_subtotal?: unknown
  /** Net of discounts — never label this "Subtotal". */
  item_total?: unknown
  shipping_subtotal?: unknown
  shipping_total?: unknown
  tax_total?: unknown
  discount_total?: unknown
  total?: unknown
  items?: Array<{
    title?: string
    product_title?: string
    variant_title?: string
    variant_sku?: string
    quantity?: unknown
    raw_quantity?: unknown
    detail?: { quantity?: unknown }
    unit_price?: unknown
    subtotal?: unknown
    total?: unknown
    discount_total?: unknown
    tax_total?: unknown
    product?: { hs_code?: string | null } | null
  }>
  shipping_address?: Address
  billing_address?: Address
  payment_collections?: Array<{
    payments?: Array<{ provider_id?: string; amount?: unknown }>
  }>
}

// -- Formatting --------------------------------------------------------------

function money(amount: unknown, currency = "INR"): string {
  const value = toNum(amount)
  const code = (currency || "INR").toUpperCase()
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: code })
      .format(value)
      .replace(/[   ]/g, " ")
  } catch {
    return `${code} ${value.toFixed(2)}`
  }
}

/** Bare number, for table cells where the currency symbol would be noise. */
function num(amount: unknown): string {
  const v = toNum(amount)
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

function qtyOf(item: NonNullable<InvoiceOrder["items"]>[number]): number {
  return toNum(item.quantity) || toNum(item.raw_quantity) || toNum(item.detail?.quantity)
}

const invoiceNumber = (o: InvoiceOrder): string =>
  o.display_id != null ? `INV-${o.display_id}` : `INV-${o.id}`
const orderNumber = (o: InvoiceOrder): string =>
  o.display_id != null ? `#${o.display_id}` : o.id

function formatDate(value?: string | Date): string {
  const d = value ? new Date(value) : new Date()
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]
  const t = TENS[Math.floor(n / 10)]
  const o = ONES[n % 10]
  return o ? `${t} ${o}` : t
}

/** The amount in words, in the Indian numbering system (crore / lakh). */
function amountInWords(amount: number, currency = "INR"): string {
  if (!Number.isFinite(amount)) return ""
  const negative = amount < 0
  const abs = Math.abs(amount)
  const rupees = Math.floor(abs)
  const paise = Math.round((abs - rupees) * 100)

  const chunk = (n: number): string => {
    if (n === 0) return ""
    const parts: string[] = []
    const crore = Math.floor(n / 10000000)
    const lakh = Math.floor((n % 10000000) / 100000)
    const thousand = Math.floor((n % 100000) / 1000)
    const hundred = Math.floor((n % 1000) / 100)
    const rest = n % 100
    if (crore) parts.push(`${chunk(crore)} Crore`)
    if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
    if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
    if (hundred) parts.push(`${ONES[hundred]} Hundred`)
    if (rest) parts.push(twoDigits(rest))
    return parts.join(" ")
  }

  // The currency CODE, not its name: an invoice states "INR ... Only", which is
  // unambiguous to a bank or an accountant in a way "Rupees" is not.
  const code = (currency || "INR").toUpperCase()
  const unit = code
  const head = rupees ? `${unit} ${chunk(rupees)}` : `${unit} Zero`
  const tail = paise ? ` and ${twoDigits(paise)} Paise` : ""
  return `${negative ? "Minus " : ""}${head}${tail} Only`
}

function joined(parts: Array<string | null | undefined>, sep = ", "): string | undefined {
  const s = parts.filter((p) => p && String(p).trim()).join(sep)
  return s || undefined
}

function addressLines(a: Address): string[] {
  if (!a) return []
  const name = joined([a.first_name, a.last_name], " ")
  const cityLine = joined([a.city, a.province, a.postal_code])
  return [
    name,
    a.company,
    a.address_1,
    a.address_2,
    cityLine,
    a.country_code ? a.country_code.toUpperCase() : undefined,
    a.phone ? `Phone: ${a.phone}` : undefined,
  ].filter((l): l is string => Boolean(l))
}

/** "pp_razorpay_razorpay" -> "Razorpay". */
function paymentMethod(order: InvoiceOrder): string | null {
  const id = order.payment_collections?.[0]?.payments?.[0]?.provider_id
  if (!id) return null
  const name = id.replace(/^pp_/, "").split("_")[0]
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : null
}

/** "2.5" not "2.50"; "5" not "5.0". */
function formatRate(rate: number): string {
  return String(Math.round(rate * 100) / 100)
}

// -- Drawing primitives ------------------------------------------------------

type Doc = InstanceType<typeof PDFDocument>

type TextOpts = {
  size?: number
  bold?: boolean
  color?: string
  width?: number
  align?: "left" | "center" | "right"
  lineGap?: number
  /** Letterspacing, in points. Used for the small-caps labels. */
  tracking?: number
}

function apply(doc: Doc, s: string, o: TextOpts) {
  doc.font(fontFor(s, o.bold ?? false)).fontSize(o.size ?? 8)
  return {
    width: o.width ?? CONTENT_W,
    align: o.align ?? "left",
    lineGap: o.lineGap ?? 0,
    characterSpacing: o.tracking ?? 0,
  }
}

function text(doc: Doc, s: string, x: number, y: number, opts: TextOpts = {}): number {
  const o = apply(doc, s, opts)
  doc.fillColor(opts.color ?? INK)
  const h = doc.heightOfString(s, o)
  doc.text(s, x, y, o)
  return h
}

function measure(doc: Doc, s: string, opts: TextOpts = {}): number {
  return doc.heightOfString(s, apply(doc, s, opts))
}

/** A field label: small, letterspaced, muted. */
function label(
  doc: Doc,
  s: string,
  x: number,
  y: number,
  width?: number,
  align?: TextOpts["align"]
): number {
  return text(doc, s.toUpperCase(), x, y, {
    size: 6.2,
    bold: true,
    color: MUTED,
    tracking: 0.75,
    width,
    align,
  })
}

function line(doc: Doc, x1: number, y1: number, x2: number, y2: number, color = GRID): void {
  doc.save().lineWidth(0.6).strokeColor(color)
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke()
  doc.restore()
}

const hr = (doc: Doc, y: number, color = GRID, width = CONTENT_W, x = MARGIN) =>
  line(doc, x, y, x + width, y, color)

function rect(doc: Doc, x: number, y: number, w: number, h: number, color = GRID): void {
  doc.save().lineWidth(0.6).strokeColor(color).rect(x, y, w, h).stroke().restore()
}

function fill(doc: Doc, x: number, y: number, w: number, h: number, color = TINT): void {
  doc.save().fillColor(color).rect(x, y, w, h).fill().restore()
}

/** Label above value, inside a grid cell. */
function field(doc: Doc, k: string, v: string, x: number, y: number, w: number): void {
  label(doc, k, x, y + 5, w - 12)
  text(doc, v, x, y + 14, { size: 8, bold: true, width: w - 12 })
}

// -- Line calculations -------------------------------------------------------

type LineCalc = {
  name: string
  sub?: string
  hsn: string | null
  qty: number
  /** Listed unit price, as shown on the storefront. */
  rate: number
  gross: number
  discount: number
  /** Post-discount amount actually charged for this line. */
  net: number
  taxable: number
  tax: number
}

type Totals = {
  grossItems: number
  discount: number
  shipping: number
  grandTotal: number
  /** Null when the invoice must say nothing at all about tax. */
  gst: {
    taxable: number
    tax: number
    rate: number
    inclusive: boolean
    components: Array<{ label: string; rate: number; amount: number }>
  } | null
}

/**
 * Work out every figure the document prints, once, so the layout code never
 * does arithmetic. The grand total is taken as authoritative and the taxable
 * value is derived from it, which is what keeps the charge stack and the tax
 * stack agreeing exactly rather than to within a rounding error.
 */
function calculate(order: InvoiceOrder, seller: SellerInfo): { lines: LineCalc[]; totals: Totals } {
  const items = order.items ?? []

  const grossItems =
    toNum(order.item_subtotal) ||
    items.reduce((s, i) => s + (toNum(i.subtotal) || toNum(i.unit_price) * qtyOf(i)), 0)
  const discount = Math.abs(toNum(order.discount_total))
  const netItems = toNum(order.item_total) || grossItems - discount
  const shipping = toNum(order.shipping_total) || toNum(order.shipping_subtotal)
  const grandTotal = toNum(order.total) || netItems + shipping

  // Rate: real tax lines win; otherwise the configured inclusive rate, and only
  // when the seller is actually registered.
  const realTax = toNum(order.tax_total)
  const hasRealTax = realTax > 0
  const inclusive = !hasRealTax
  const rate = hasRealTax
    ? grandTotal - realTax > 0
      ? round2((realTax / (grandTotal - realTax)) * 100)
      : 0
    : seller.gstin && seller.gstRate
      ? seller.gstRate
      : 0

  const taxed = rate > 0 && grandTotal > 0

  const lines: LineCalc[] = items.map((item) => {
    const qty = qtyOf(item)
    const gross = toNum(item.subtotal) || toNum(item.unit_price) * qty
    const lineDiscount = Math.abs(toNum(item.discount_total))
    const net = toNum(item.total) || gross - lineDiscount
    let taxable = net
    let tax = 0
    if (taxed) {
      if (hasRealTax && toNum(item.tax_total)) {
        tax = round2(toNum(item.tax_total))
        taxable = round2(net - tax)
      } else {
        const split = extractInclusiveTax(net, rate)
        taxable = split.taxable
        tax = split.tax
      }
    }
    return {
      name: item.product_title || item.title || "Item",
      sub: joined([
        item.variant_title,
        item.variant_sku ? `SKU ${item.variant_sku}` : undefined,
      ]),
      hsn: item.product?.hs_code || seller.defaultHsn,
      qty,
      rate: qty ? gross / qty : toNum(item.unit_price),
      gross,
      discount: lineDiscount,
      net,
      taxable,
      tax,
    }
  })

  let gst: Totals["gst"] = null
  if (taxed) {
    const shippingSplit = shipping > 0 ? extractInclusiveTax(shipping, rate) : { taxable: 0, tax: 0 }
    const tax = round2(lines.reduce((s, l) => s + l.tax, 0) + shippingSplit.tax)
    // Derived, not accumulated — see the function comment.
    const taxable = round2(grandTotal - tax)
    const sellerCode = seller.stateCode ?? stateCode(seller.state)
    const supplyCode = stateCode(
      order.shipping_address?.province ?? order.billing_address?.province ?? null
    )
    const split = splitGst({
      taxable,
      tax,
      rate,
      sellerStateCode: sellerCode,
      supplyStateCode: supplyCode,
      inclusive,
    })
    gst = { taxable, tax, rate, inclusive, components: split.components }
  }

  return { lines, totals: { grossItems, discount, shipping, grandTotal, gst } }
}

// -- Item table --------------------------------------------------------------

type Column = {
  key: string
  w: number
  align: "left" | "right"
  value: (l: LineCalc, i: number) => string
}

function buildColumns(lines: LineCalc[], taxed: boolean, showDiscount: boolean): Column[] {
  const cols: Column[] = [
    // 18pt leaves 8pt of usable width after padding, which wraps a two-digit
    // row number onto two lines — item 20 printed as "2" over "0".
    { key: "#", w: 26, align: "left", value: (_l, i) => String(i + 1) },
    { key: "Item", w: 0, align: "left", value: (l) => l.name },
    { key: "HSN/SAC", w: 52, align: "left", value: (l) => l.hsn ?? "—" },
    { key: "Rate", w: 52, align: "right", value: (l) => num(l.rate) },
    { key: "Qty", w: 28, align: "right", value: (l) => String(l.qty) },
  ]
  if (showDiscount) {
    cols.push({ key: "Discount", w: 52, align: "right", value: (l) => (l.discount ? `- ${num(l.discount)}` : "—") })
  }
  if (taxed) {
    // Single-word headings: "Taxable value" / "Tax amount" wrap to two lines in
    // a 56pt column and leave the header row looking cramped and misaligned.
    cols.push({ key: "Taxable", w: 58, align: "right", value: (l) => num(l.taxable) })
    cols.push({ key: "Tax", w: 52, align: "right", value: (l) => num(l.tax) })
  }
  cols.push({ key: "Amount", w: 62, align: "right", value: (l) => num(l.net) })

  // "Item" absorbs whatever the fixed columns leave.
  const fixed = cols.reduce((s, c) => s + c.w, 0)
  cols[1].w = CONTENT_W - fixed
  if (!lines.some((l) => l.hsn)) {
    // Nothing to put in an HSN column — give the space back to the description.
    const idx = cols.findIndex((c) => c.key === "HSN/SAC")
    cols[1].w += cols[idx].w
    cols.splice(idx, 1)
  }
  return cols
}

const CELL_PAD = 5

function columnX(cols: Column[]): number[] {
  const xs: number[] = []
  let x = MARGIN
  for (const c of cols) {
    xs.push(x)
    x += c.w
  }
  return xs
}

function tableHeader(doc: Doc, cols: Column[], xs: number[], y: number): number {
  const h = 17
  fill(doc, MARGIN, y, CONTENT_W, h)
  cols.forEach((c, i) => {
    label(
      doc,
      c.key,
      xs[i] + CELL_PAD,
      y + 5.5,
      c.w - CELL_PAD * 2,
      c.align === "right" ? "right" : "left"
    )
  })
  return y + h
}

// -- The document ------------------------------------------------------------

/**
 * Render the invoice for `order` and resolve with the finished PDF bytes.
 *
 * Never throws for content reasons — a missing address, a zero total or an item
 * with no title all render as an incomplete-but-valid document. The caller
 * treats any failure here as "send the email without an attachment", never as a
 * reason to fail the order.
 */
export async function buildInvoicePdf(
  order: InvoiceOrder,
  seller: SellerInfo = getSellerInfo()
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [PAGE.width, PAGE.height],
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `${seller.brand} invoice ${invoiceNumber(order)}`,
      Author: seller.entityName,
      Subject: `Invoice for order ${orderNumber(order)}`,
      Creator: seller.brand,
    },
  })

  doc.registerFont(F.brand, MANGO_REGULAR())
  doc.registerFont(F.brandBold, MANGO_SEMIBOLD())
  doc.registerFont(F.body, POPPINS_REGULAR())

  const chunks: Buffer[] = []
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
  })

  const currency = order.currency_code || "INR"
  const m = (v: unknown) => money(v, currency)
  const { lines, totals } = calculate(order, seller)
  const gst = totals.gst

  let y = MARGIN

  // -- Masthead (unchanged) --------------------------------------------------
  try {
    doc.image(BACOOLA_LOGO(), MARGIN, y + 2, { width: 132 })
  } catch {
    text(doc, seller.brand, MARGIN, y, { size: 18, bold: true })
  }
  label(doc, seller.gstin ? "Tax Invoice" : "Invoice", MARGIN + CONTENT_W - 220, y, 220, "right")
  text(doc, "Original for Recipient", MARGIN + CONTENT_W - 220, y + 10, {
    size: 7.2,
    color: MUTED,
    width: 220,
    align: "right",
  })
  y += 30
  hr(doc, y, INK)
  y += 1.4
  hr(doc, y, INK)
  y += 10

  // -- Seller + invoice meta grid -------------------------------------------
  const sellerLines = [
    seller.entityName,
    seller.gstin ? `GSTIN: ${seller.gstin}` : undefined,
    seller.pan ? `PAN: ${seller.pan}` : undefined,
    seller.cin ? `CIN: ${seller.cin}` : undefined,
    joined([...seller.addressLines, seller.state, seller.postalCode], ", "),
    seller.phone ? `Mobile: ${seller.phone}` : undefined,
    seller.email ? `Email: ${seller.email}` : undefined,
    seller.supportUrl ? `Website: ${seller.supportUrl}` : undefined,
  ].filter((l): l is string => Boolean(l))

  const pos = placeOfSupply(
    order.shipping_address?.province ?? order.billing_address?.province ?? null
  )
  const method = paymentMethod(order)
  const metaLeft: Array<[string, string]> = [
    ["Invoice #", invoiceNumber(order)],
    ["Order number", orderNumber(order)],
    ["Place of supply", pos ?? "—"],
  ]
  const metaRight: Array<[string, string]> = [
    ["Invoice date", formatDate(order.created_at)],
    ["Order date", formatDate(order.created_at)],
    ["Payment", method ? `${method} — Paid` : "Paid"],
  ]

  const sellerW = CONTENT_W * 0.44
  const metaW = (CONTENT_W - sellerW) / 2

  let sellerH = 8
  for (const [i, l] of sellerLines.entries()) {
    sellerH += measure(doc, l, { size: 7.4, bold: i === 0, width: sellerW - CELL_PAD * 2, lineGap: 1 }) + 1.5
  }
  sellerH += 8
  const headBoxH = Math.max(sellerH, 78)
  // The meta cells divide the FULL box height between them, so the grid has no
  // dead space under the last one when the seller block is the taller side.
  const metaRowH = headBoxH / 3

  rect(doc, MARGIN, y, CONTENT_W, headBoxH)
  line(doc, MARGIN + sellerW, y, MARGIN + sellerW, y + headBoxH)
  line(doc, MARGIN + sellerW + metaW, y, MARGIN + sellerW + metaW, y + headBoxH)

  let sy = y + 7
  sellerLines.forEach((l, i) => {
    sy +=
      text(doc, l, MARGIN + CELL_PAD + 2, sy, {
        size: 7.4,
        bold: i === 0,
        color: i === 0 ? INK : BODY,
        width: sellerW - CELL_PAD * 2 - 4,
        lineGap: 1,
      }) + 1.5
  })

  metaLeft.forEach(([k, v], i) => {
    const cy = y + i * metaRowH
    if (i) line(doc, MARGIN + sellerW, cy, MARGIN + sellerW + metaW, cy, HAIRLINE)
    field(doc, k, v, MARGIN + sellerW + CELL_PAD + 2, cy, metaW - CELL_PAD)
  })
  metaRight.forEach(([k, v], i) => {
    const cy = y + i * metaRowH
    if (i) line(doc, MARGIN + sellerW + metaW, cy, MARGIN + CONTENT_W, cy, HAIRLINE)
    field(doc, k, v, MARGIN + sellerW + metaW + CELL_PAD + 2, cy, metaW - CELL_PAD)
  })
  y += headBoxH

  // -- Customer / delivery grid ---------------------------------------------
  const billTo = order.billing_address ?? order.shipping_address ?? null
  const billLines = addressLines(billTo)
  const shipLines = addressLines(order.shipping_address ?? null)
  if (order.email) billLines.push(order.email)

  const custW = CONTENT_W * 0.5
  const dispatchLines = [joined([...seller.addressLines, seller.state, seller.postalCode], ", ")!]

  const blockH = (title: string, ls: string[], w: number) => {
    let h = 6 + measure(doc, title, { size: 6.2, tracking: 0.75, width: w }) + 3
    ls.forEach((l, i) => {
      h += measure(doc, l, { size: 7.4, bold: i === 0, width: w, lineGap: 1 }) + 1.5
    })
    return h + 6
  }
  const custW_ = custW - CELL_PAD * 2 - 4
  const shipW_ = CONTENT_W - custW - CELL_PAD * 2 - 4
  const custH = blockH("Customer details", billLines, custW_)
  const shipH = blockH("Shipping address", shipLines.length ? shipLines : ["Not provided"], shipW_)
  const dispH = blockH("Dispatch from", dispatchLines, shipW_)
  const partyH = Math.max(custH, shipH + dispH)

  rect(doc, MARGIN, y, CONTENT_W, partyH)
  line(doc, MARGIN + custW, y, MARGIN + custW, y + partyH)

  const drawBlock = (title: string, ls: string[], x: number, top: number, w: number) => {
    let cy = top + 6
    cy += label(doc, title, x, cy, w) + 3
    ls.forEach((l, i) => {
      cy +=
        text(doc, l, x, cy, {
          size: 7.4,
          bold: i === 0,
          color: i === 0 ? INK : BODY,
          width: w,
          lineGap: 1,
        }) + 1.5
    })
    return cy + 6
  }
  drawBlock("Customer details", billLines.length ? billLines : ["Not provided"], MARGIN + CELL_PAD + 2, y, custW_)
  const shipBottom = drawBlock(
    "Shipping address",
    shipLines.length ? shipLines : ["Not provided"],
    MARGIN + custW + CELL_PAD + 2,
    y,
    shipW_
  )
  line(doc, MARGIN + custW, shipBottom, MARGIN + CONTENT_W, shipBottom, HAIRLINE)
  drawBlock("Dispatch from", dispatchLines, MARGIN + custW + CELL_PAD + 2, shipBottom, shipW_)
  y += partyH

  // -- Line items ------------------------------------------------------------
  const showDiscount = lines.some((l) => l.discount > 0)
  const cols = buildColumns(lines, Boolean(gst), showDiscount)
  const xs = columnX(cols)
  const descIdx = cols.findIndex((c) => c.key === "Item")

  type Row = { line: LineCalc; index: number; nameH: number; subH: number; h: number }
  const rows: Row[] = lines.map((l, i) => {
    const w = cols[descIdx].w - CELL_PAD * 2
    const nameH = measure(doc, l.name, { size: 7.6, width: w })
    const subH = l.sub ? measure(doc, l.sub, { size: 6.8, width: w }) + 2 : 0
    return { line: l, index: i, nameH, subH, h: Math.max(nameH + subH, 11) + 11 }
  })

  let tableTop = y
  y = tableHeader(doc, cols, xs, y)

  /** Close the grid on the current page: verticals + outer border. */
  const closeTable = (top: number, bottom: number) => {
    for (let i = 1; i < cols.length; i++) line(doc, xs[i], top, xs[i], bottom)
    rect(doc, MARGIN, top, CONTENT_W, bottom - top)
  }

  for (const row of rows) {
    if (y + row.h > BOTTOM) {
      closeTable(tableTop, y)
      doc.addPage()
      tableTop = MARGIN
      y = tableHeader(doc, cols, xs, MARGIN)
    }
    cols.forEach((c, i) => {
      const w = c.w - CELL_PAD * 2
      const x = xs[i] + CELL_PAD
      if (i === descIdx) {
        text(doc, row.line.name, x, y + 5, { size: 7.6, width: w })
        if (row.line.sub) {
          text(doc, row.line.sub, x, y + 5 + row.nameH + 2, { size: 6.8, color: MUTED, width: w })
        }
      } else {
        text(doc, c.value(row.line, row.index), x, y + 5, {
          size: 7.6,
          color: c.key === "#" ? MUTED : BODY,
          width: w,
          align: c.align,
        })
      }
    })
    y += row.h
    hr(doc, y, HAIRLINE)
  }

  if (!rows.length) {
    text(doc, "No items on this order.", MARGIN + CELL_PAD, y + 6, { size: 7.6, color: MUTED })
    y += 22
  }
  closeTable(tableTop, y)

  // -- Totals ----------------------------------------------------------------
  // Ruled into the same grid as everything above it: one tall cell on the left
  // carrying the tally, and a two-column ledger on the right where each figure
  // sits in its own bordered row. Floating the numbers in whitespace made this
  // the one band on the page that did not read as part of the document.
  //
  // Two stacks that each arrive at the same figure:
  //   charge:  subtotal - discount + shipping
  //   tax:     taxable value + GST
  // Shipping therefore belongs ABOVE the taxable value, since the tax is
  // computed over goods and delivery together.
  type TotalRow = { k: string; v: string; heavy?: boolean }
  const chargeRows: TotalRow[] = [{ k: "Subtotal", v: num(totals.grossItems) }]
  if (totals.discount) chargeRows.push({ k: "Discount", v: `- ${num(totals.discount)}` })
  if (totals.shipping || !gst) chargeRows.push({ k: "Shipping", v: num(totals.shipping) })
  if (gst) {
    chargeRows.push({ k: "Taxable amount", v: num(gst.taxable), heavy: true })
    for (const c of gst.components) {
      chargeRows.push({ k: `${c.label} @ ${formatRate(c.rate)}%`, v: num(c.amount) })
    }
  }
  // "Amount paid" / "Amount due" are dropped: the order is paid before the
  // invoice exists, so both lines restate what the Payment cell and the Notes
  // already say, and a "due" line on a settled invoice invites a second look.

  // The ledger's vertical rules land on the item table's OWN column boundaries,
  // so the grid lines run unbroken from the table into the totals instead of
  // stopping and restarting a few points to one side.
  //
  // Snapping to the LAST boundary is not enough: the table's Amount column is
  // 62pt, which wrapped "₹2,989.00" at the Total's size. Each edge is therefore
  // the nearest boundary that still leaves the cell wide enough for its
  // contents, and falls back to a free position if no boundary qualifies.
  // A boundary is only usable if it leaves BOTH neighbouring cells wide enough.
  // Constraining one side alone collapsed the tally cell to 26pt on an order
  // with few columns, and "Total items / Qty" wrapped one character per line.
  // With no boundary in range the edge falls back to a free position: an
  // unaligned rule beats an unreadable cell.
  const right = MARGIN + CONTENT_W
  const snap = (target: number, min: number, max: number) => {
    const ok = xs.filter((x) => x >= min && x <= max)
    return ok.length
      ? ok.reduce((b, x) => (Math.abs(x - target) < Math.abs(b - target) ? x : b))
      : Math.min(Math.max(target, min), max)
  }
  const amtX = snap(right - 116, right - 190, right - 104)
  const amtW = right - amtX
  const sumX = snap(amtX - 148, MARGIN + 150, amtX - 110)
  const sumW = right - sumX
  const ROW_H = 15.5
  const TOTAL_H = 28

  const totalQty = lines.reduce((s, l) => s + l.qty, 0)
  const leftW = sumX - MARGIN - CELL_PAD * 2 - 4
  const note = gst?.inclusive
    ? `Listed prices are inclusive of GST at ${formatRate(gst.rate)}%. The tax shown is the ` +
      `component contained in the price, not an additional charge.`
    : null

  let leftH = 7 + measure(doc, "Total items / Qty", { size: 8, width: leftW }) + 4
  if (note) leftH += measure(doc, note, { size: 6.8, width: leftW, lineGap: 1 })
  leftH += 7

  const ledgerH = chargeRows.length * ROW_H + TOTAL_H
  const boxH = Math.max(ledgerH, leftH)

  if (y + boxH + 26 > BOTTOM) {
    doc.addPage()
    y = MARGIN
  }

  const totalsTop = y
  rect(doc, MARGIN, totalsTop, CONTENT_W, boxH)
  line(doc, sumX, totalsTop, sumX, totalsTop + boxH)
  line(doc, amtX, totalsTop, amtX, totalsTop + boxH)

  /**
   * One ledger row. Label and amount are set at the SAME size — they are two
   * halves of one statement, and sizing the number up made the pair look like a
   * mistake rather than an emphasis. Both are centred on measured height rather
   * than on the nominal point size, so a row reads level whichever face the
   * fallback picked for it.
   */
  const ledgerRow = (r: TotalRow, ry: number, h: number, size: number, bold: boolean) => {
    const o = { size, bold, align: "right" as const }
    const labelW = amtX - sumX - CELL_PAD * 2
    const valueW = amtW - CELL_PAD * 2
    const lh = measure(doc, r.k, { ...o, width: labelW })
    const vh = measure(doc, r.v, { ...o, width: valueW })
    text(doc, r.k, sumX + CELL_PAD, ry + (h - lh) / 2, {
      ...o,
      color: bold ? INK : MUTED,
      width: labelW,
    })
    text(doc, r.v, amtX + CELL_PAD, ry + (h - vh) / 2, {
      ...o,
      color: bold ? INK : BODY,
      width: valueW,
    })
  }

  let ty = totalsTop
  chargeRows.forEach((r, i) => {
    if (i) line(doc, sumX, ty, sumX + sumW, ty, r.heavy ? GRID : HAIRLINE)
    ledgerRow(r, ty, ROW_H, 8, false)
    ty += ROW_H
  })

  // The total: framed by full-strength rules and set larger, rather than filled.
  // A tinted slab read as a separate object dropped onto the page; the rules
  // make it the emphatic row OF the ledger.
  line(doc, sumX, ty, sumX + sumW, ty, INK)
  ledgerRow({ k: "Total", v: m(totals.grandTotal) }, ty, TOTAL_H, 11.5, true)
  ty += TOTAL_H
  // Close the frame — unless the ledger reaches the bottom of the box, where
  // the box's own border already draws that rule.
  if (ty < totalsTop + boxH - 0.5) line(doc, sumX, ty, sumX + sumW, ty, INK)

  // Left cell: the item/qty tally, as on a conventional tax invoice.
  let ly = totalsTop + 7
  ly +=
    text(doc, `Total items / Qty : ${lines.length} / ${totalQty}`, MARGIN + CELL_PAD + 2, ly, {
      size: 8,
      color: BODY,
      width: leftW,
    }) + 4
  if (note) {
    text(doc, note, MARGIN + CELL_PAD + 2, ly, {
      size: 6.8,
      color: MUTED,
      width: leftW,
      lineGap: 1,
    })
  }

  y = totalsTop + boxH

  // -- Amount in words -------------------------------------------------------
  const words = amountInWords(totals.grandTotal, currency)
  if (words) {
    const wordsH = 22
    if (y + wordsH > BOTTOM) {
      doc.addPage()
      y = MARGIN
    }
    rect(doc, MARGIN, y, CONTENT_W, wordsH)
    fill(doc, MARGIN + 0.6, y + 0.6, CONTENT_W - 1.2, wordsH - 1.2)
    text(doc, `Total amount (in words):  ${words}`, MARGIN + CELL_PAD + 2, y + 7, {
      size: 7.6,
      bold: true,
      width: CONTENT_W - CELL_PAD * 2,
    })
    y += wordsH
  }

  // -- HSN-wise tax summary --------------------------------------------------
  if (gst) {
    y = taxSummary(doc, y, lines, totals, seller)
  }

  // -- Notes, terms, signature ----------------------------------------------
  y = footerBlocks(doc, y, seller)

  // -- Page footers ----------------------------------------------------------
  // Written last, over the buffered pages, because "Page 1 of N" needs N.
  //
  // The bottom margin is dropped to zero first. pdfkit treats it as a hard
  // boundary and silently STARTS A NEW PAGE for any text that would cross it —
  // so a footer drawn in the margin, which is the only place a footer belongs,
  // spawns one blank page per call and prints nothing on it. A three-item
  // invoice came out three pages long for exactly this reason.
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    doc.page.margins.bottom = 0
    const fy = PAGE.height - MARGIN + 8
    hr(doc, fy - 9, HAIRLINE)
    text(
      doc,
      `Page ${i + 1}/${range.count}  ·  This is a computer-generated invoice.`,
      MARGIN,
      fy,
      { size: 6.8, color: MUTED, width: CONTENT_W / 2 }
    )
    text(
      doc,
      joined([seller.entityName, seller.supportUrl ?? undefined], "  ·  ")!,
      MARGIN + CONTENT_W / 2,
      fy,
      { size: 6.8, color: MUTED, width: CONTENT_W / 2, align: "right" }
    )
  }

  doc.end()
  return done
}

/**
 * HSN-wise tax summary — the block a buyer's accountant reads to claim input
 * credit. Rows are grouped by HSN, with delivery as its own row so the goods
 * classification is not quietly made to cover a service.
 */
function taxSummary(
  doc: Doc,
  y: number,
  lines: LineCalc[],
  totals: Totals,
  seller: SellerInfo
): number {
  const gst = totals.gst!
  const groups = new Map<string, { taxable: number; tax: number }>()
  for (const l of lines) {
    const key = l.hsn ?? "—"
    const g = groups.get(key) ?? { taxable: 0, tax: 0 }
    g.taxable += l.taxable
    g.tax += l.tax
    groups.set(key, g)
  }
  if (totals.shipping > 0) {
    const key = seller.shippingSac ?? "Delivery"
    const g = groups.get(key) ?? { taxable: 0, tax: 0 }
    const split = extractInclusiveTax(totals.shipping, gst.rate)
    g.taxable += split.taxable
    g.tax += split.tax
    groups.set(key, g)
  }

  // Absorb rounding drift into the largest row so the TOTAL line matches the
  // figures printed above it exactly.
  const rows = [...groups.entries()].map(([hsn, g]) => ({
    hsn,
    taxable: round2(g.taxable),
    tax: round2(g.tax),
  }))
  if (rows.length) {
    const biggest = rows.reduce((a, b) => (b.taxable > a.taxable ? b : a))
    biggest.taxable = round2(biggest.taxable + (gst.taxable - rows.reduce((s, r) => s + r.taxable, 0)))
    biggest.tax = round2(biggest.tax + (gst.tax - rows.reduce((s, r) => s + r.tax, 0)))
  }

  const comps = gst.components
  const widths = [92, 78, ...comps.map(() => 92), 0]
  widths[widths.length - 1] = CONTENT_W - widths.reduce((s, w) => s + w, 0)
  const heads = [
    "HSN / SAC",
    "Taxable value",
    ...comps.map((c) => `${c.label} @ ${formatRate(c.rate)}%`),
    "Total tax",
  ]

  const headH = 17
  const bodyH = 16
  const boxH = headH + rows.length * bodyH + bodyH
  if (y + boxH + 16 > BOTTOM) {
    doc.addPage()
    y = MARGIN
  }
  // No leading gap: this box shares its top edge with the block above, so the
  // grid runs continuously from the item table to the foot of the page.
  const top = y
  const xs: number[] = []
  let x = MARGIN
  for (const w of widths) {
    xs.push(x)
    x += w
  }

  fill(doc, MARGIN, y, CONTENT_W, headH)
  heads.forEach((h, i) => {
    label(doc, h, xs[i] + CELL_PAD, y + 5.5, widths[i] - CELL_PAD * 2, i ? "right" : "left")
  })
  y += headH

  const cellsFor = (r: (typeof rows)[number]) => {
    // Split each row's tax across the components in the same proportion the
    // order-level split used, so the columns add up on every line.
    const share = gst.tax ? r.tax / gst.tax : 0
    return [
      r.hsn,
      num(r.taxable),
      ...comps.map((c) => num(round2(c.amount * share))),
      num(r.tax),
    ]
  }

  for (const r of rows) {
    cellsFor(r).forEach((v, i) => {
      text(doc, v, xs[i] + CELL_PAD, y + 4.5, {
        size: 7.4,
        color: BODY,
        width: widths[i] - CELL_PAD * 2,
        align: i ? "right" : "left",
      })
    })
    y += bodyH
    hr(doc, y, HAIRLINE)
  }

  const totalCells = [
    "Total",
    num(gst.taxable),
    ...comps.map((c) => num(c.amount)),
    num(gst.tax),
  ]
  fill(doc, MARGIN, y, CONTENT_W, bodyH)
  totalCells.forEach((v, i) => {
    text(doc, v, xs[i] + CELL_PAD, y + 4.5, {
      size: 7.4,
      bold: true,
      width: widths[i] - CELL_PAD * 2,
      align: i ? "right" : "left",
    })
  })
  y += bodyH

  for (let i = 1; i < xs.length; i++) line(doc, xs[i], top, xs[i], y)
  rect(doc, MARGIN, top, CONTENT_W, y - top)
  return y
}

/**
 * Notes | Terms | Declaration + signature, as three cells in ONE row.
 *
 * Stacking notes above terms made the block ~150pt tall, which pushed a
 * one-item invoice onto a second page carrying nothing but boilerplate. Three
 * columns put the height at the tallest single cell instead of the sum.
 */
function footerBlocks(doc: Doc, y: number, seller: SellerInfo): number {
  const ws = [CONTENT_W * 0.27, CONTENT_W * 0.43, 0]
  ws[2] = CONTENT_W - ws[0] - ws[1]
  const xs = [MARGIN, MARGIN + ws[0], MARGIN + ws[0] + ws[1]]
  const inner = (i: number) => ws[i] - CELL_PAD * 2 - 4
  const SIZE = 6.4

  const termLines = seller.terms.map((t, i) => `${i + 1}. ${t}`)

  /** Height of one cell: label, then its lines. */
  const cellH = (title: string, ls: string[], i: number) => {
    let h = 7 + measure(doc, title.toUpperCase(), { size: 6.2, tracking: 0.75, width: inner(i) }) + 3
    for (const l of ls) h += measure(doc, l, { size: SIZE, width: inner(i), lineGap: 1 }) + 2
    return h + 7
  }

  const signLines = [seller.declaration]
  const boxH = Math.max(
    cellH("Notes", seller.notes, 0),
    cellH("Terms and conditions", termLines, 1),
    cellH("Declaration", signLines, 2) + 34 // room for the signature rule
  )

  if (y + boxH + 12 > BOTTOM) {
    doc.addPage()
    y = MARGIN
  }
  // Shares its top edge with the tax summary above — see taxSummary().
  rect(doc, MARGIN, y, CONTENT_W, boxH)
  line(doc, xs[1], y, xs[1], y + boxH)
  line(doc, xs[2], y, xs[2], y + boxH)

  const draw = (title: string, ls: string[], i: number, align: TextOpts["align"] = "left") => {
    const x = xs[i] + CELL_PAD + 2
    let cy = y + 7
    cy += label(doc, title, x, cy, inner(i), align) + 3
    for (const l of ls) {
      cy +=
        text(doc, l, x, cy, { size: SIZE, color: BODY, width: inner(i), lineGap: 1, align }) + 2
    }
    return cy
  }

  draw("Notes", seller.notes, 0)
  draw("Terms and conditions", termLines, 1)
  draw("Declaration", signLines, 2, "right")

  // Signature, pinned to the bottom of its cell.
  const sx = xs[2] + CELL_PAD + 2
  const signLineY = y + boxH - 17
  text(doc, `For ${seller.signatory}`, sx, signLineY - 13, {
    size: 7.2,
    bold: true,
    width: inner(2),
    align: "right",
  })
  line(doc, xs[2] + ws[2] - 12 - Math.min(120, inner(2)), signLineY, xs[2] + ws[2] - 12, signLineY, GRID)
  text(doc, "Authorised signatory", sx, signLineY + 3.5, {
    size: 6.4,
    color: MUTED,
    width: inner(2),
    align: "right",
  })

  return y + boxH
}

/** The filename the attachment is delivered under. */
export function invoiceFileName(order: InvoiceOrder): string {
  return `${invoiceNumber(order)}.pdf`
}
