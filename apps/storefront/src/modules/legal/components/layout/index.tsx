import React from "react"
import { LEGAL, LegalFact } from "@lib/legal-config"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Shared chrome for the policy pages.
 *
 * The typography here is lifted from the original terms page so the new pages
 * are visually indistinguishable from it. It lives in one place because five
 * pages repeating the same nine Tailwind classes is how they drift apart.
 */

export function LegalPage({
  title,
  intro,
  showUpdated = true,
  children,
}: {
  title: string
  /** Standfirst under the title. Used by the editorial pages, which have no date. */
  intro?: string
  /**
   * "Last updated" belongs on a policy, where the date is itself a claim about
   * when the terms last moved. The editorial pages (Company, Careers, ...) set
   * this false: stamping a date on them would imply a revision history nobody
   * maintains.
   */
  showUpdated?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white min-h-screen pt-24 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-[15px] font-bold uppercase tracking-wide text-neutral-950 mb-4">
          {title}
        </h1>
        {showUpdated && (
          <p className="text-[12px] lg:text-[14px] text-neutral-900 mb-10">
            Last updated: {LEGAL.lastUpdated}
          </p>
        )}
        {intro && (
          <p className="text-[12px] lg:text-[14px] text-neutral-900 leading-[1.8] mb-10 max-w-2xl">
            {intro}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}

export function Section({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12">
      <h2 className="text-[12px] lg:text-[14px] sm:text-[15px] font-bold uppercase tracking-wide text-neutral-950 mb-4">
        {heading}
      </h2>
      <div className="space-y-4 text-[12px] lg:text-[14px] text-neutral-900 leading-[1.8] font-normal">
        {children}
      </div>
    </section>
  )
}

/**
 * A fact the business has not supplied yet.
 *
 * Deliberately loud. The alternative -- rendering nothing, or a plausible
 * default -- produces a page that READS as finished while making a claim
 * nobody has stood behind, which is precisely the failure mode that put a
 * Spanish VAT number on an Indian store's terms. An obviously unfinished page
 * is safe; a confidently wrong one is not.
 */
export function Pending({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 not-italic">
      [TO BE COMPLETED: {children}]
    </mark>
  )
}

/**
 * Renders a fact, or a Pending marker when it has not been supplied.
 * `describe` is what the marker asks for, so it must read as an instruction.
 */
export function Fact({
  value,
  describe,
}: {
  value: LegalFact
  describe: string
}) {
  return value ? <>{value}</> : <Pending>{describe}</Pending>
}

/** The trading name, or the registered entity where one is needed by law. */
export function Entity() {
  return <Fact value={LEGAL.entityName} describe="registered legal entity name" />
}

export function Address() {
  const { lines, state, postalCode, country } = LEGAL.registeredOffice
  return (
    <>
      {lines.map((line) => (
        <React.Fragment key={line}>
          {line}
          <br />
        </React.Fragment>
      ))}
      {state} {postalCode}
      <br />
      {country}
    </>
  )
}

/**
 * The grievance block required by Rule 4(5) of the Consumer Protection
 * (E-Commerce) Rules, 2020: a named officer, contact details, acknowledgement
 * within 48 hours and resolution within one month. Repeated on Privacy, Terms
 * and Contact because a customer looking for it will check any of the three.
 */
export function GrievanceOfficer() {
  const { name, designation, email, phone } = LEGAL.grievanceOfficer
  return (
    <>
      <p>
        In accordance with the Consumer Protection (E-Commerce) Rules, 2020 and
        the Information Technology Act, 2000 and the rules made thereunder, the
        contact details of our {designation} are set out below.
      </p>
      <p>
        <strong>Name:</strong>{" "}
        <Fact value={name} describe="grievance officer's full name" />
        <br />
        <strong>Designation:</strong> {designation}
        <br />
        <strong>Email:</strong>{" "}
        <a
          href={`mailto:${email}`}
          className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
        >
          {email}
        </a>
        <br />
        <strong>Telephone:</strong> {phone}
        <br />
        <strong>Address:</strong> {LEGAL.brand}, <Address />
      </p>
      <p>
        We will acknowledge your complaint within forty-eight (48) hours of
        receipt and endeavour to resolve it within one (1) month from the date
        of receipt, in line with the timelines prescribed under those rules.
      </p>
    </>
  )
}

/**
 * A link to another policy page, in the style the old terms page used.
 *
 * LocalizedClientLink, not a bare <a>: these pages live under /[countryCode],
 * so a plain "/help" drops the prefix and forces a middleware redirect on every
 * click. The old terms page did exactly that.
 */
export function PolicyLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <LocalizedClientLink
      href={href}
      className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
    >
      {children}
    </LocalizedClientLink>
  )
}
