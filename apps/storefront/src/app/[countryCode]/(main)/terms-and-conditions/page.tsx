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
  title: "Terms & Conditions",
  description:
    "The conditions of sale governing purchases made from Bacoola through this website.",
}

/**
 * Rewritten from scratch against Indian law.
 *
 * The previous version of this page was another retailer's terms with the name
 * replaced. It bound "Bacoola MNG, S.A." of Barcelona, quoted a Spanish VAT
 * number and a Barcelona companies register entry, and listed twenty-eight EU
 * member states as the distribution area -- in a document that purports to be
 * the contract between this store and an Indian customer. None of it was
 * salvageable by editing, so none of it was kept.
 */
export default function TermsAndConditions() {
  return (
    <LegalPage title="Terms and conditions">
      <Section heading="Introduction">
        <p>
          These terms and conditions govern the sale of products by{" "}
          <Entity /> (&quot;{LEGAL.brand}&quot;, &quot;we&quot;, &quot;us&quot;)
          through this website, and your use of the website itself.
        </p>
        <p>
          By placing an order you accept these terms. Please read them before
          you order. If there is anything you do not agree with, do not place an
          order and contact us instead.
        </p>
      </Section>

      <Section heading="Our details">
        <p>The seller under these terms is:</p>
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

      <Section heading="Eligibility">
        <p>
          To place an order you must be at least 18 years of age and competent
          to contract under the Indian Contract Act, 1872. By ordering you
          confirm that you are.
        </p>
        <p>
          Products sold through this website are distributed within{" "}
          {LEGAL.shipsTo} only. We do not accept orders for delivery outside{" "}
          {LEGAL.shipsTo}.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You are responsible for keeping your account credentials confidential
          and for all activity carried out under your account. Tell us promptly
          if you believe your account has been used without your authorisation.
        </p>
        <p>
          We may suspend or close an account where we have reasonable grounds to
          believe it is being used fraudulently or in breach of these terms.
        </p>
      </Section>

      <Section heading="Products and availability">
        <p>
          We take care to describe and picture products accurately. Photographs
          are illustrative, and the colour reproduced on your screen may differ
          slightly from the actual product.
        </p>
        <p>
          All products are subject to availability. If an item becomes
          unavailable after you have ordered it, we will tell you and refund the
          amount paid for that item in full.
        </p>
      </Section>

      <Section heading="Prices and taxes">
        <p>
          Prices are displayed in Indian Rupees and are inclusive of Goods and
          Services Tax unless stated otherwise. Delivery charges, where
          applicable, are shown separately before you confirm your order and are
          set out in our{" "}
          <PolicyLink href="/shipping-policy">Shipping Policy</PolicyLink>.
        </p>
        <p>
          We may change prices at any time, but a change will not affect an
          order we have already accepted. If a product is listed at a manifestly
          incorrect price as a result of an error, we are not obliged to supply
          it at that price; we will contact you and you may confirm the order at
          the correct price or cancel it for a full refund.
        </p>
      </Section>

      <Section heading="How a contract is formed">
        <p>
          Your order is an offer to buy. It is not accepted until we send you
          confirmation that the order, or part of it, has been dispatched. Only
          the items named in that dispatch confirmation form part of the
          contract.
        </p>
        <p>
          We may decline an order where the product is unavailable, where we
          cannot obtain authorisation for your payment, where a pricing error
          has occurred, or where we have reasonable grounds to suspect
          fraudulent use of the website.
        </p>
      </Section>

      <Section heading="Payment">
        <p>
          Payments are processed by {LEGAL.paymentGateway}. We do not receive or
          store your full card number, CVV or UPI credentials — these are
          handled by the payment gateway under the standards applicable to it,
          including the card storage and tokenisation requirements of the
          Reserve Bank of India.
        </p>
        <p>
          Your order will not be dispatched until payment has been received in
          full and authorised.
        </p>
      </Section>

      <Section heading="Delivery">
        <p>
          Delivery timelines, charges and serviceable areas are set out in our{" "}
          <PolicyLink href="/shipping-policy">Shipping Policy</PolicyLink>,
          which forms part of these terms.
        </p>
        <p>
          Risk in the products passes to you on delivery. Title passes when we
          have received payment in full.
        </p>
      </Section>

      <Section heading="Cancellations, returns and refunds">
        <p>
          You may return an eligible item within {LEGAL.returnWindowDays} days
          of delivery. The conditions that apply, the items that cannot be
          returned, and the way refunds are made are set out in our{" "}
          <PolicyLink href="/refund-and-cancellation-policy">
            Refund and Cancellation Policy
          </PolicyLink>
          , which forms part of these terms.
        </p>
      </Section>

      <Section heading="Intellectual property">
        <p>
          The {LEGAL.brand} name and logo, and the content of this website
          including text, photographs, graphics and page design, are owned by us
          or used under licence. You may not copy, reproduce, distribute or
          create derivative works from them without our written permission.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>
          You may not use this website to do anything unlawful; attempt to gain
          unauthorised access to it or to any system connected to it; introduce
          malicious code; extract data from it by automated means; place
          fraudulent or speculative orders; or resell products bought from it in
          a manner that misrepresents their origin.
        </p>
      </Section>

      <Section heading="Content you submit">
        <p>
          If you submit a review, image or other content, you confirm that it is
          your own, that it is not unlawful or offensive, and that you grant us
          a non-exclusive, royalty-free licence to display it in connection with
          the product concerned. We may remove content that breaches these
          terms.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          Nothing in these terms excludes or limits our liability where it
          cannot lawfully be excluded or limited, including liability for death
          or personal injury caused by our negligence, for fraud, or under the
          Consumer Protection Act, 2019.
        </p>
        <p>
          Subject to that, our total liability in connection with an order is
          limited to the amount you paid for that order, and we are not liable
          for indirect or consequential loss.
        </p>
      </Section>

      <Section heading="Events outside our control">
        <p>
          We are not liable for delay or failure to perform caused by events
          beyond our reasonable control, including natural disasters, strikes,
          civil unrest, epidemics, failures of public infrastructure, and
          restrictions imposed by government authorities. Where such an event
          occurs we will contact you, and you may cancel any affected order for
          a full refund.
        </p>
      </Section>

      <Section heading="Governing law and jurisdiction">
        <p>
          These terms are governed by the laws of India. The courts at{" "}
          {LEGAL.jurisdiction.city}, {LEGAL.jurisdiction.state} shall have
          exclusive jurisdiction over any dispute arising out of them, without
          prejudice to any right you may have to approach a consumer forum
          having jurisdiction under the Consumer Protection Act, 2019.
        </p>
      </Section>

      <Section heading="Grievance redressal">
        <GrievanceOfficer />
        <p>
          You may also raise a complaint with the National Consumer Helpline on
          1915 or through the INGRAM portal maintained by the Department of
          Consumer Affairs.
        </p>
      </Section>

      <Section heading="Changes to these terms">
        <p>
          We may amend these terms. The version that applies to your order is
          the version published on this page at the time you place it, and the
          date it last changed is shown at the top.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          For any query relating to these terms, or to an order, write to us at{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>
          , call {LEGAL.phone}, or use our{" "}
          <PolicyLink href="/contact">Contact</PolicyLink> page.
        </p>
      </Section>
    </LegalPage>
  )
}
