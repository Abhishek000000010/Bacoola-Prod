/**
 * GST facts an Indian invoice has to state, kept away from the layout code.
 *
 * Two things live here:
 *
 *   1. The state → GST state-code table. Every GSTIN begins with the two-digit
 *      code of the state that issued it, and the "place of supply" on an
 *      invoice is stated as "Maharashtra (27)". The codes are fixed by statute,
 *      so this is reference data, not configuration.
 *
 *   2. The intra-state / inter-state split. This is the one piece of GST
 *      arithmetic that is easy to get wrong and expensive to get wrong: when
 *      the place of supply is the seller's own state the tax splits into CGST +
 *      SGST at half the rate each; when it is a different state it is a single
 *      IGST line at the full rate. Printing CGST/SGST on an inter-state supply
 *      (or the reverse) makes the buyer's input-credit claim fail.
 */

/** Statutory GST state codes, keyed by a normalised state name. */
const STATE_CODES: Record<string, string> = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  punjab: "03",
  chandigarh: "04",
  uttarakhand: "05",
  haryana: "06",
  delhi: "07",
  rajasthan: "08",
  "uttar pradesh": "09",
  bihar: "10",
  sikkim: "11",
  "arunachal pradesh": "12",
  nagaland: "13",
  manipur: "14",
  mizoram: "15",
  tripura: "16",
  meghalaya: "17",
  assam: "18",
  "west bengal": "19",
  jharkhand: "20",
  odisha: "21",
  chhattisgarh: "22",
  "madhya pradesh": "23",
  gujarat: "24",
  "dadra and nagar haveli and daman and diu": "26",
  maharashtra: "27",
  karnataka: "29",
  goa: "30",
  lakshadweep: "31",
  kerala: "32",
  "tamil nadu": "33",
  puducherry: "34",
  "andaman and nicobar islands": "35",
  telangana: "36",
  "andhra pradesh": "37",
  ladakh: "38",
  "other territory": "97",
}

/** A few spellings that turn up in real addresses but not in the table above. */
const ALIASES: Record<string, string> = {
  "j&k": "jammu and kashmir",
  "jammu & kashmir": "jammu and kashmir",
  "new delhi": "delhi",
  "nct of delhi": "delhi",
  pondicherry: "puducherry",
  orissa: "odisha",
  uttaranchal: "uttarakhand",
  "daman and diu": "dadra and nagar haveli and daman and diu",
  "dadra and nagar haveli": "dadra and nagar haveli and daman and diu",
}

function normalise(state: string): string {
  const s = state
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, " and ")
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
  return ALIASES[s] ?? s
}

/** The two-digit GST code for a state name, or null if it is not recognised. */
export function stateCode(state?: string | null): string | null {
  if (!state) return null
  return STATE_CODES[normalise(state)] ?? null
}

/** "Maharashtra (27)", or just the state when the code is unknown. */
export function placeOfSupply(state?: string | null): string | null {
  if (!state) return null
  const code = stateCode(state)
  const name = state.trim()
  return code ? `${name} (${code})` : name
}

export type GstBreakup = {
  /** The value the tax is charged on. */
  taxable: number
  /** Total tax across all components. */
  tax: number
  /** Combined rate as a percentage, e.g. 5 for 5%. */
  rate: number
  /**
   * Same-state supply: tax splits CGST + SGST at half the rate each. A
   * different state means one IGST line at the full rate.
   */
  intraState: boolean
  components: Array<{ label: string; rate: number; amount: number }>
  /**
   * True when the tax was extracted from a GST-inclusive listed price rather
   * than added on top. Callers must SAY SO on the document — the buyer is
   * entitled to know whether the price already contained the tax.
   */
  inclusive: boolean
}

/**
 * Split a tax amount into the components the invoice must print.
 *
 * `taxable` and `tax` are taken as given; this function decides only how the
 * tax is *labelled*, which is entirely a function of the two state codes.
 */
export function splitGst(input: {
  taxable: number
  tax: number
  rate: number
  sellerStateCode: string | null
  supplyStateCode: string | null
  inclusive: boolean
}): GstBreakup {
  const { taxable, tax, rate, sellerStateCode, supplyStateCode, inclusive } = input

  // Unknown place of supply falls back to intra-state, which is the safe default
  // for a store that ships from and to one state; it is also what the seller's
  // own registration implies when the buyer's state cannot be determined.
  const intraState =
    !sellerStateCode || !supplyStateCode || sellerStateCode === supplyStateCode

  const components = intraState
    ? [
        { label: "CGST", rate: rate / 2, amount: round2(tax / 2) },
        { label: "SGST", rate: rate / 2, amount: round2(tax - round2(tax / 2)) },
      ]
    : [{ label: "IGST", rate, amount: round2(tax) }]

  return { taxable, tax, rate, intraState, components, inclusive }
}

/**
 * Back out the tax hidden inside a GST-inclusive amount.
 *
 * Indian apparel is generally listed at a tax-inclusive price, and the invoice
 * is expected to disclose the split without changing what the customer pays:
 * taxable = gross / (1 + rate), tax = gross - taxable.
 */
export function extractInclusiveTax(gross: number, rate: number): { taxable: number; tax: number } {
  if (!rate || !Number.isFinite(gross)) return { taxable: round2(gross), tax: 0 }
  const taxable = round2(gross / (1 + rate / 100))
  return { taxable, tax: round2(gross - taxable) }
}

export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}
