import { Metadata } from "next"
import { LEGAL } from "@lib/legal-config"
import {
  Fact,
  LegalPage,
  PolicyLink,
  Section,
} from "@modules/legal/components/layout"

export const metadata: Metadata = {
  title: "Shipping policy",
  description:
    "Where Bacoola delivers, how long it takes, what it costs, and how to track your order.",
}

/**
 * Required for Razorpay merchant onboarding, and expected under the Consumer
 * Protection (E-Commerce) Rules, 2020, which require a seller to state delivery
 * arrangements before the customer commits.
 *
 * The timings and charges are left as Pending markers rather than filled with
 * plausible numbers: a delivery promise is a term the customer relies on when
 * deciding to buy, and inventing one would be making a commitment on the
 * business's behalf.
 */
export default function ShippingPolicy() {
  return (
    <LegalPage title="Shipping policy">
      <Section heading="Where we deliver">
        <p>
          We deliver to addresses within {LEGAL.shipsTo} only. We do not
          currently ship internationally.
        </p>
        <p>
          A small number of pin codes may not be serviceable by our delivery
          partners. If yours is not, we will tell you and refund your order in
          full.
        </p>
      </Section>

      <Section heading="Order processing">
        <p>
          Orders are processed on working days, excluding public holidays.
          Orders are usually dispatched within{" "}
          <Fact
            value={LEGAL.dispatchTime}
            describe="dispatch time, e.g. 1-2 working days"
          />{" "}
          of payment being confirmed.
        </p>
        <p>
          You will receive a dispatch confirmation by email once your order
          leaves our warehouse. That confirmation is also the point at which
          your order is accepted, as set out in our{" "}
          <PolicyLink href="/terms-and-conditions">
            Terms and Conditions
          </PolicyLink>
          .
        </p>
      </Section>

      <Section heading="Delivery time">
        <p>
          Once dispatched, orders are typically delivered within{" "}
          <Fact
            value={LEGAL.deliveryTime}
            describe="delivery window, e.g. 3-7 working days"
          />
          , depending on your location.
        </p>
        <p>
          These are estimates, not guarantees. Delivery may take longer during
          sale periods, festivals, or where conditions outside our control
          affect the courier network.
        </p>
      </Section>

      <Section heading="Delivery charges">
        <p>
          <Fact
            value={LEGAL.shippingCharges}
            describe="shipping charges, including any free-delivery threshold"
          />
        </p>
        <p>
          Any applicable charge is shown separately at checkout before you
          confirm and pay, so you always see the total before committing.
        </p>
      </Section>

      <Section heading="Tracking your order">
        <p>
          Your dispatch confirmation includes a tracking reference. You can also
          see the status of any order from{" "}
          <PolicyLink href="/account/orders">My Purchases</PolicyLink> when
          signed in to your account.
        </p>
      </Section>

      <Section heading="If delivery is attempted and fails">
        <p>
          Our courier will ordinarily attempt delivery more than once. Please
          make sure the delivery address and telephone number you give us are
          accurate and that someone is available to receive the order.
        </p>
        <p>
          If an order is returned to us undelivered because the address was
          incorrect or incomplete, or because delivery could not be completed
          after repeated attempts, we will contact you to arrange redelivery or
          to process a refund in accordance with our{" "}
          <PolicyLink href="/refund-and-cancellation-policy">
            Refund and Cancellation Policy
          </PolicyLink>
          .
        </p>
      </Section>

      <Section heading="Damaged or tampered packages">
        <p>
          If a package arrives visibly damaged, opened or tampered with, please
          refuse delivery where you can, and tell us within 48 hours at{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-[1.5px] text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>
          . Photographs of the outer packaging help us resolve the claim with
          the courier quickly.
        </p>
      </Section>

      <Section heading="Delays outside our control">
        <p>
          We are not liable for delays caused by events beyond our reasonable
          control, including weather, natural disasters, strikes, civil unrest
          or restrictions imposed by government authorities. Where such a delay
          becomes significant we will contact you, and you may cancel the
          affected order for a full refund.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          For any question about a delivery, write to{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-[1.5px] text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>{" "}
          or call {LEGAL.phone}.
        </p>
      </Section>
    </LegalPage>
  )
}
