import { Metadata } from "next"
import { LEGAL } from "@lib/legal-config"
import { LegalPage, PolicyLink, Section } from "@modules/legal/components/layout"

export const metadata: Metadata = {
  title: "Responsibility",
  description:
    "How Bacoola thinks about durability, sourcing, packaging and the people who make our clothes.",
}

/**
 * Commitments, never claimed achievements.
 *
 * Every sentence here is about how we intend to operate. There are no
 * percentages, certifications, audit results or material claims, because a
 * sustainability claim that cannot be substantiated is a false advertising
 * exposure -- greenwashing is separately actionable in India under the CCPA's
 * guidelines, and "70% organic cotton" invented for a placeholder page is
 * exactly the kind of statement that gets tested.
 *
 * When real data exists (supplier audits, material composition, recycled
 * packaging share), it belongs here and this framing can tighten up.
 */
export default function ResponsibilityPage() {
  return (
    <LegalPage
      title="Responsibility"
      showUpdated={false}
      intro="We would rather say less and mean it. These are the commitments we hold ourselves to, written as intentions rather than achievements."
    >
      <Section heading="Making clothes that last">
        <p>
          The single most useful thing a clothing brand can do is sell garments
          that survive being worn. We build our range around staples rather than
          single-season trend pieces, and we would rather carry fewer styles that
          hold their shape than a wider catalogue that does not.
        </p>
        <p>
          Our care instructions are written to extend the life of a garment, not
          to protect us from complaints. Following them genuinely helps.
        </p>
      </Section>

      <Section heading="The people who make them">
        <p>
          We expect the facilities producing our garments to pay lawful wages,
          maintain safe working conditions, and use no child or forced labour.
          These are conditions of doing business with us, not aspirations.
        </p>
        <p>
          Where we find a supplier falling short, our preference is to require
          correction with a deadline rather than to walk away quietly — leaving
          simply moves the problem to somebody else&apos;s order book.
        </p>
      </Section>

      <Section heading="Packaging and deliveries">
        <p>
          We aim to ship in the smallest packaging a garment can safely travel
          in, avoid packaging that exists only for presentation, and consolidate
          multi-item orders into a single parcel wherever stock allows.
        </p>
      </Section>

      <Section heading="Returns">
        <p>
          Returns carry a real environmental cost, and the most effective way to
          reduce them is to help you order the right size the first time. That is
          why we publish size guidance on product pages and keep sizing
          consistent within a collection.
        </p>
        <p>
          When a return is the right outcome, our{" "}
          <PolicyLink href="/refund-and-cancellation-policy">
            Refund and Cancellation Policy
          </PolicyLink>{" "}
          sets out how it works.
        </p>
      </Section>

      <Section heading="Speaking up">
        <p>
          If you believe something about how we operate falls short of what is
          written here, tell us. Our{" "}
          <PolicyLink href="/ethics">Ethics Channel</PolicyLink> explains how to
          raise a concern, including anonymously.
        </p>
      </Section>

      <Section heading="Questions">
        <p>
          Write to{" "}
          <a
            href={`mailto:${LEGAL.email}`}
            className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>
          . If you are asking about materials or sourcing for a specific product,
          include the product name and we will give you what we know.
        </p>
      </Section>
    </LegalPage>
  )
}
