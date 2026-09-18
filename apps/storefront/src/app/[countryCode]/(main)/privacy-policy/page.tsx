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
  title: "Privacy & Cookie Policy",
  description:
    "How Bacoola collects, uses, shares and protects your personal data, and the rights you have over it.",
}

/**
 * Written to the Indian regime: the Digital Personal Data Protection Act, 2023
 * (consent, purpose limitation, data principal rights) layered over the
 * Information Technology Act, 2000 s.43A and the SPDI Rules, 2011, which still
 * govern sensitive personal data and prescribe the grievance officer.
 *
 * Not adapted from any other retailer's policy. The previous terms page was,
 * and it left a Spanish company and an EU distribution list on an India-only
 * store.
 */
export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy policy and cookies">
      <Section heading="Who we are">
        <p>
          This policy explains how <Entity /> (&quot;{LEGAL.brand}&quot;,
          &quot;we&quot;, &quot;us&quot;) handles personal data collected
          through this website and the services offered on it.
        </p>
        <p>
          {LEGAL.brand}
          <br />
          <Address />
        </p>
        <p>
          For the purposes of the Digital Personal Data Protection Act, 2023, we
          are the Data Fiduciary in respect of the personal data described
          below. You are the Data Principal.
        </p>
      </Section>

      <Section heading="What we collect">
        <p>We collect only what the service actually needs:</p>
        <p>
          <strong>Information you give us.</strong> Your name, email address,
          telephone number, and billing and delivery addresses when you create
          an account or place an order. Your date of birth or sizing
          preferences, where you choose to provide them.
        </p>
        <p>
          <strong>Order information.</strong> The items you buy, order value,
          delivery status, returns and refunds.
        </p>
        <p>
          <strong>Payment information.</strong> Card and other payment
          instrument details are collected and processed directly by our payment
          gateway, {LEGAL.paymentGateway}. We do not receive or store your full
          card number, CVV or UPI credentials on our systems. We receive only
          the outcome of the transaction and a reference to it.
        </p>
        <p>
          <strong>Technical information.</strong> IP address, browser and device
          type, and pages visited, collected through cookies and similar
          technologies as described below.
        </p>
      </Section>

      <Section heading="Consent and the basis on which we process your data">
        <p>
          We process your personal data on the basis of the consent you give
          when you create an account, place an order, or subscribe to our
          newsletter, and for the certain legitimate uses recognised under the
          Digital Personal Data Protection Act, 2023.
        </p>
        <p>
          Your consent is sought for a specified purpose, is limited to the
          personal data necessary for that purpose, and may be withdrawn at any
          time. Withdrawing consent does not affect the lawfulness of processing
          carried out before the withdrawal, and we may continue to retain data
          where a law requires us to.
        </p>
      </Section>

      <Section heading="How we use your data">
        <p>
          To create and manage your account; to process, deliver and invoice
          your orders; to handle returns, exchanges, refunds and cancellations;
          to provide customer support; to detect and prevent fraud and misuse of
          the website; to meet our tax, accounting and other legal obligations;
          and, where you have opted in, to send you marketing communications.
        </p>
        <p>
          We do not use your personal data for any purpose incompatible with the
          purpose for which it was collected, and we do not sell your personal
          data.
        </p>
      </Section>

      <Section heading="Who we share it with">
        <p>
          <strong>Logistics partners.</strong> Your name, delivery address and
          telephone number are shared with {LEGAL.logisticsPartner} and the
          courier assigned to your order, solely so that the order can be
          delivered.
        </p>
        <p>
          <strong>Payment gateway.</strong> {LEGAL.paymentGateway} processes
          your payment and receives the data necessary to do so.
        </p>
        <p>
          <strong>Service providers.</strong> Hosting, email delivery and
          analytics providers who process data on our instructions and are bound
          to use it only for the purposes we specify.
        </p>
        <p>
          <strong>Legal disclosure.</strong> Where we are required to disclose
          data by law, by a court, or to a government agency lawfully authorised
          to demand it.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          Cookies are small files stored on your device. We use cookies that are
          strictly necessary for the website to function — keeping you signed
          in, remembering the contents of your bag, and preserving your selected
          region — and, where you allow them, cookies that help us understand
          how the website is used so we can improve it.
        </p>
        <p>
          You can block or delete cookies through your browser settings.
          Blocking strictly necessary cookies will prevent parts of the website,
          including checkout, from working.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          We retain your personal data for as long as your account remains
          active, and thereafter for the period required to meet our legal,
          tax and accounting obligations — in particular records relating to
          orders and invoices, which must be retained under applicable tax law.
        </p>
        <p>
          When personal data is no longer needed for the purpose it was
          collected for and no law requires us to retain it, we erase it.
        </p>
      </Section>

      <Section heading="How we protect it">
        <p>
          We implement reasonable security practices and procedures as required
          under Section 43A of the Information Technology Act, 2000 and the
          Information Technology (Reasonable Security Practices and Procedures
          and Sensitive Personal Data or Information) Rules, 2011. These include
          encryption of data in transit, access controls limiting staff access
          to what their role requires, and keeping card data off our systems
          entirely by delegating payment processing to {LEGAL.paymentGateway}.
        </p>
        <p>
          No method of transmission or storage is completely secure. In the
          event of a personal data breach we will notify you and the Data
          Protection Board of India as required under the Digital Personal Data
          Protection Act, 2023.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>As a Data Principal you have the right to:</p>
        <p>
          — obtain confirmation of whether we are processing your personal data,
          and a summary of that data and the processing;
          <br />— require correction of inaccurate or misleading data, and
          completion or updating of incomplete data;
          <br />— require erasure of your personal data, where we are not
          required by law to retain it;
          <br />— nominate another individual to exercise these rights on your
          behalf in the event of your death or incapacity;
          <br />— withdraw a consent you have given; and
          <br />— have your grievance addressed by the officer named below.
        </p>
        <p>
          To exercise any of these rights, write to us at{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>
          . You may be asked to verify your identity before we act on a request.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          This website is not directed at children. We do not knowingly collect
          the personal data of anyone under the age of 18 without the verifiable
          consent of a parent or lawful guardian, and we do not undertake
          tracking, behavioural monitoring or targeted advertising directed at
          children, as required under the Digital Personal Data Protection Act,
          2023.
        </p>
      </Section>

      <Section heading="Where your data is processed">
        <p>
          We ship only within {LEGAL.shipsTo}, and your personal data is
          processed in {LEGAL.shipsTo} save where a service provider named above
          processes it elsewhere under contractual safeguards.
        </p>
      </Section>

      <Section heading="Grievance officer">
        <GrievanceOfficer />
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this policy. The version in force is the one published
          on this page, and the date it last changed is shown at the top. Where
          a change materially affects how we use your data, we will bring it to
          your attention.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about this policy can be sent to{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>{" "}
          or raised through our <PolicyLink href="/contact">Contact</PolicyLink>{" "}
          page. Our GSTIN is{" "}
          <Fact value={LEGAL.gstin} describe="GSTIN" />.
        </p>
      </Section>
    </LegalPage>
  )
}
