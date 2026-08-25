import { Metadata } from "next"
import { LEGAL } from "@lib/legal-config"
import {
  Address,
  Entity,
  Fact,
  GrievanceOfficer,
  LegalPage,
  PolicyLink,
  Section,
} from "@modules/legal/components/layout"

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Bacoola's registered office, customer support contact details, and grievance officer.",
}

/**
 * Rule 4(2) and 4(5) of the Consumer Protection (E-Commerce) Rules, 2020
 * require an e-commerce entity to display its legal name, registered office
 * address, customer care contact details and the name and contact of its
 * grievance officer. Before this page the storefront carried no contact detail
 * of any kind.
 */
export default function ContactPage() {
  return (
    <LegalPage title="Contact us">
      <Section heading="Customer service">
        <p>
          <strong>Email:</strong>{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-[1.5px] text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>
          <br />
          <strong>Telephone:</strong>{" "}
          <a
            href={`tel:${LEGAL.phone.replace(/\s/g, "")}`}
            className="font-bold underline underline-offset-[3px] decoration-[1.5px] text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.phone}
          </a>
          <br />
          <strong>Hours:</strong>{" "}
          <Fact
            value={LEGAL.supportHours}
            describe="support hours, e.g. Monday to Saturday, 10am to 7pm IST"
          />
        </p>
        <p>
          For questions about an existing order, quoting your order number helps
          us answer faster. You can find it under{" "}
          <PolicyLink href="/account/orders">My Purchases</PolicyLink>.
        </p>
      </Section>

      <Section heading="Registered office">
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
        </p>
      </Section>

      <Section heading="Grievance officer">
        <GrievanceOfficer />
      </Section>

      <Section heading="Consumer helpline">
        <p>
          If your complaint is not resolved to your satisfaction, you may
          approach the National Consumer Helpline on 1915, or file a complaint
          through the INGRAM portal maintained by the Department of Consumer
          Affairs, Government of India.
        </p>
      </Section>

      <Section heading="Policies">
        <p>
          <PolicyLink href="/terms-and-conditions">
            Terms and Conditions
          </PolicyLink>
          <br />
          <PolicyLink href="/privacy-policy">
            Privacy Policy and Cookies
          </PolicyLink>
          <br />
          <PolicyLink href="/shipping-policy">Shipping Policy</PolicyLink>
          <br />
          <PolicyLink href="/refund-and-cancellation-policy">
            Refund and Cancellation Policy
          </PolicyLink>
        </p>
      </Section>
    </LegalPage>
  )
}
