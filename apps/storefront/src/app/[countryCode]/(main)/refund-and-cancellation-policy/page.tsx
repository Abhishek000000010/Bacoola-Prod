import { Metadata } from "next"
import { LEGAL } from "@lib/legal-config"
import {
  Fact,
  GrievanceOfficer,
  LegalPage,
  PolicyLink,
  Section,
} from "@modules/legal/components/layout"

export const metadata: Metadata = {
  title: "Refund and cancellation policy",
  description:
    "How to cancel an order, return an item within 15 days, and how refunds are processed.",
}

/**
 * Required for Razorpay merchant onboarding, and the page a customer is
 * directed to when they dispute a charge.
 *
 * Two terms are deliberately left as Pending markers: who bears return
 * shipping, and how long a refund takes. Both are commitments about the
 * customer's money. A default that turned out to be wrong would be worse than
 * an obviously unfinished sentence.
 */
export default function RefundAndCancellationPolicy() {
  return (
    <LegalPage title="Refund and cancellation policy">
      <Section heading="Cancelling an order">
        <p>
          You can cancel an order at no cost at any time before it is
          dispatched. Cancel from{" "}
          <PolicyLink href="/account/orders">My Purchases</PolicyLink> when
          signed in, or contact us and we will do it for you.
        </p>
        <p>
          Once an order has been dispatched it can no longer be cancelled, but
          you can return it under the return policy below once it reaches you.
        </p>
      </Section>

      <Section heading="Returning an item">
        <p>
          You may return an eligible item within{" "}
          <strong>{LEGAL.returnWindowDays} days of delivery</strong>.
        </p>
        <p>To be eligible, the item must be:</p>
        <p>
          — unused, unwashed and undamaged, in the condition you received it;
          <br />— in its original packaging, with all tags and labels attached;
          and
          <br />— accompanied by the invoice or order reference.
        </p>
      </Section>

      <Section heading="Items that cannot be returned">
        <p>
          For reasons of hygiene, innerwear, swimwear and pierced jewellery
          cannot be returned or exchanged once the sealed packaging or hygiene
          seal has been removed.
        </p>
        <p>
          Items marked as final sale at the time of purchase, and items damaged
          through use rather than a manufacturing defect, are not eligible for
          return.
        </p>
        <p>
          This does not affect your rights in respect of goods that are
          defective or not as described.
        </p>
      </Section>

      <Section heading="How to start a return">
        <p>
          Go to <PolicyLink href="/account/orders">My Purchases</PolicyLink>,
          select the order, and raise a return request. Alternatively, write to{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-[1.5px] text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>{" "}
          quoting your order number, within {LEGAL.returnWindowDays} days of
          delivery.
        </p>
      </Section>

      <Section heading="Return shipping">
        <p>
          <Fact
            value={LEGAL.returnShippingBorneBy}
            describe="who bears return shipping cost — free pickup, or customer-paid"
          />
        </p>
        <p>
          Where an item is returned because it is defective, damaged in transit,
          or not the item you ordered, we bear the cost of return in every case.
        </p>
      </Section>

      <Section heading="Refunds">
        <p>
          Once your return reaches us it is inspected against the conditions
          above. We will tell you the outcome by email.
        </p>
        <p>
          Approved refunds are made to the original payment method, through{" "}
          {LEGAL.paymentGateway}, within{" "}
          <Fact
            value={LEGAL.refundTurnaroundDays}
            describe="refund turnaround, e.g. 5-7 working days from receipt"
          />
          . The time it then takes to appear on your statement depends on your
          bank or card issuer.
        </p>
        <p>
          Where a delivery charge was paid on the original order, it is refunded
          in full if the return is because of a defect, damage or an incorrect
          item, and is otherwise not refunded.
        </p>
        <p>
          If a return does not meet the conditions above we will contact you
          before sending it back to you.
        </p>
      </Section>

      <Section heading="Exchanges">
        <p>
          To exchange an item for a different size, raise a return for the
          original item and place a new order for the size you want. This is
          usually faster than an exchange, and avoids the size you want selling
          out while the original is in transit back to us.
        </p>
      </Section>

      <Section heading="Damaged, defective or incorrect items">
        <p>
          If an item arrives damaged or defective, or is not what you ordered,
          tell us within 48 hours of delivery at{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-[1.5px] text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>
          , with photographs where possible. We will arrange collection and
          issue a replacement or a full refund, including any delivery charge,
          at no cost to you.
        </p>
      </Section>

      <Section heading="Grievance redressal">
        <GrievanceOfficer />
      </Section>
    </LegalPage>
  )
}
