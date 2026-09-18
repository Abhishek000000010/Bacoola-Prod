import { Metadata } from "next"
import { LEGAL } from "@lib/legal-config"
import {
  Address,
  Entity,
  Fact,
  LegalPage,
  PolicyLink,
  Section,
} from "@modules/legal/components/layout"

export const metadata: Metadata = {
  title: "About Us",
  description:
    "About Bacoola: who we are, what we make, and how to reach our company, press, careers and customer service teams.",
}

/**
 * Deliberately free of invented specifics: no founding year, headcount, revenue,
 * awards or milestones. Everything here is either verifiable from the storefront
 * itself (what we sell, where we ship, how to contact us) or framed as intent
 * rather than achievement. An "about us" page that asserts a founding date
 * nobody can back up is a liability dressed as marketing copy.
 */
export default function CompanyPage() {
  return (
    <LegalPage
      title="Company"
      showUpdated={false}
      intro="Bacoola is an online fashion retailer serving customers across India, with collections for women, men, teens and kids."
    >
      <Section heading="What we do">
        <p>
          We design and sell ready-to-wear clothing across four lines — Women,
          Men, Teen and Kids — sold exclusively through this website and
          delivered across {LEGAL.shipsTo}.
        </p>
        <p>
          Our catalogue is organised around everyday wardrobe staples rather
          than fast-moving trend pieces: pieces meant to be worn often, kept
          for a while, and combined with what you already own.
        </p>
      </Section>

      <Section heading="How we work">
        <p>
          We sell direct. There is no reseller or marketplace layer between our
          catalogue and your order, which is what lets us keep the range tight
          and the sizing consistent across a collection.
        </p>
        <p>
          Every order is fulfilled from our own inventory and dispatched through
          our logistics partners. You can follow it from{" "}
          <PolicyLink href="/account/orders">My Purchases</PolicyLink> at any
          point after dispatch.
        </p>
      </Section>

      <Section heading="Company details">
        <p>
          <Entity />
          <br />
          Trading as {LEGAL.brand}
          <br />
          <Address />
        </p>
        <p>
          <strong>CIN:</strong> <Fact value={LEGAL.cin} describe="CIN" />
          <br />
          <strong>GSTIN:</strong> <Fact value={LEGAL.gstin} describe="GSTIN" />
          <br />
          <strong>Email:</strong> {LEGAL.email}
          <br />
          <strong>Telephone:</strong> {LEGAL.phone}
        </p>
      </Section>

      <Section heading="More">
        <p>
          <PolicyLink href="/contact">Contact us</PolicyLink>
          <br />
          <PolicyLink href="/careers">Work for Bacoola</PolicyLink>
          <br />
          <PolicyLink href="/press">Press</PolicyLink>
          <br />
          <PolicyLink href="/responsibility">Responsibility</PolicyLink>
        </p>
      </Section>
    </LegalPage>
  )
}
