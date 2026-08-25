/**
 * Every business fact the legal pages state, in one place.
 *
 * The legal pages used to be Mango's, search-and-replaced. That is how
 * "Bacoola MNG, S.A. ... Barcelona (Spain) ... VAT ES-A59088948" survived in a
 * document that forms a contract with Indian customers: the facts were spread
 * across hundreds of lines of JSX, so nobody could see what was wrong or fix it
 * in one pass. Every page now reads from here instead. Change the address once
 * and it changes on all five pages.
 *
 * `null` means NOT SUPPLIED YET. It is not an empty string and must never be
 * rendered as one -- the pages surface it as a visible [TO BE COMPLETED] marker
 * so an unfinished policy always looks unfinished. Silently omitting a missing
 * GSTIN would leave a page that reads as complete while making a statement the
 * business cannot stand behind, which is the exact failure being corrected here.
 */

/** A fact the business must supply. `null` until it does. */
export type LegalFact = string | null

export const LEGAL = {
  /** Trading name, as shown to customers. */
  brand: "Bacoola",

  /**
   * The registered legal entity that actually contracts with the customer.
   * REQUIRED before launch: this is the name the Terms bind, and getting it
   * wrong is the defect this file exists to prevent. Do not guess it from the
   * email domain -- put the name exactly as it appears on the incorporation
   * certificate, including "Private Limited"/"LLP".
   */
  entityName: "Bacoola" as LegalFact,

  /** Corporate Identity Number, if incorporated. From the MCA certificate. */
  cin: null as LegalFact,

  /**
   * GST Identification Number. Must be displayed under the CGST rules once
   * registered, and Razorpay asks for it during merchant onboarding.
   */
  gstin: null as LegalFact,

  registeredOffice: {
    lines: [
      "Centura Square, IT Park",
      "7th Floor, Road Number 27",
      "Wagle Industrial Estate",
      "Thane West, Thane",
    ],
    state: "Maharashtra",
    postalCode: "400604",
    country: "India",
  },

  email: "yash.mishra@datacircles.in",
  phone: "+91 88794 38577",

  /**
   * Rule 4(5) of the Consumer Protection (E-Commerce) Rules, 2020 requires a
   * NAMED grievance officer, not just an address: name, designation and
   * contact details have to be displayed. The contact channels below are
   * confirmed; the name still needs to be stated explicitly by the business
   * rather than inferred from the mailbox it happens to point at.
   */
  grievanceOfficer: {
    name: "Yash Mishra" as LegalFact,
    designation: "Grievance Officer",
    email: "yash.mishra@datacircles.in",
    phone: "+91 88794 38577",
  },

  /**
   * Support hours as displayed on Contact. Stated in IST because the store
   * ships only within India.
   */
  supportHours: null as LegalFact,

  /** Days from delivery within which a return may be raised. */
  returnWindowDays: 15,

  /**
   * Who bears the return courier cost, and how long a refund takes once the
   * item is received and inspected. Both are money terms the customer relies
   * on, so neither gets a plausible-looking default.
   */
  returnShippingBorneBy: null as LegalFact,
  refundTurnaroundDays: null as LegalFact,

  /** Order processing and delivery windows, and the shipping fee structure. */
  dispatchTime: null as LegalFact,
  deliveryTime: null as LegalFact,
  shippingCharges: null as LegalFact,

  /** Payment gateway. Named in the Terms and the Privacy Policy's sharing section. */
  paymentGateway: "Razorpay",

  /** Logistics partner, named in the Privacy Policy's sharing section. */
  logisticsPartner: "Shiprocket",

  /**
   * India only. The storefront's United States region must stay disabled for
   * this to remain true -- a reachable USD checkout would contradict the
   * shipping policy and the choice-of-law clause below.
   */
  shipsTo: "India",

  /**
   * Chosen to follow the registered office. Courts at the place of business is
   * the ordinary drafting choice, but it IS a choice: confirm it, because it
   * decides where a customer has to sue you and where you have to defend.
   */
  jurisdiction: {
    city: "Thane",
    state: "Maharashtra",
  },

  /**
   * Shown as "Last updated" on every page. Bump it whenever the substance of a
   * policy changes -- customers and payment gateways both read this date as a
   * claim about when the terms last moved.
   */
  lastUpdated: "25 August 2026",
} as const

/** The registered office as a single line, for running text. */
export const addressLine = (): string => {
  const { lines, state, postalCode, country } = LEGAL.registeredOffice
  return `${lines.join(", ")}, ${state} ${postalCode}, ${country}`
}

/**
 * Physical stores, for the store locator.
 *
 * `hours` is a LegalFact and stays null until someone states the real opening
 * times. A store locator is the one place where a wrong detail costs the
 * customer a journey: they read it, travel across a city, and find the door
 * shut. Better a visibly unfinished line than a confident wrong one.
 */
export type Store = {
  id: string
  name: string
  addressLines: string[]
  city: string
  state: string
  postalCode: string
  hours: LegalFact
  /** Collections carried in store. */
  sections: string[]
  phone: string
  email: string
}

export const STORES: Store[] = [
  {
    id: "thane-wagle-estate",
    name: "Thane — Wagle Estate",
    addressLines: [
      "Centura Square, IT Park, 7th Floor",
      "Road Number 27, Wagle Industrial Estate",
    ],
    city: "Thane West, Thane",
    state: "Maharashtra",
    postalCode: "400604",
    hours: null,
    sections: ["Women", "Men", "Teen", "Kids"],
    phone: LEGAL.phone,
    email: LEGAL.email,
  },
]

/** A store's full address on one line — used for the map query and directions. */
export const storeAddress = (store: Store): string =>
  `${store.addressLines.join(", ")}, ${store.city}, ${store.state} ${store.postalCode}, India`
