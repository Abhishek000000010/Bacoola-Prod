import { Metadata } from "next"
import { LEGAL } from "@lib/legal-config"
import { LegalPage, PolicyLink, Section } from "@modules/legal/components/layout"

export const metadata: Metadata = {
  title: "Ethics Channel",
  description:
    "How to report a concern about conduct at Bacoola, including anonymously.",
}

/**
 * This is the one page in this set where a placeholder would have been actively
 * dangerous. An ethics channel is where somebody reports harassment, fraud or a
 * safety problem; a decorative one absorbs that report and does nothing with it,
 * and the person who trusted it is worse off than if the page had never existed.
 *
 * So it routes to a real, monitored mailbox -- the same one behind the grievance
 * officer -- and states only commitments the business can actually keep. If a
 * dedicated whistleblowing provider is adopted later, replace the channel here;
 * do not add one that is not read.
 */
export default function EthicsPage() {
  return (
    <LegalPage
      title="Ethics channel"
      showUpdated={false}
      intro="If something here is being done wrongly, we would rather hear it from you than not hear it at all."
    >
      <Section heading="What this channel is for">
        <p>
          Use it to report conduct you believe is unlawful, dishonest, unsafe or
          contrary to the commitments we publish — including fraud, bribery,
          harassment or discrimination, unsafe working conditions anywhere in our
          supply chain, misuse of personal data, or misleading claims about our
          products.
        </p>
        <p>
          It is open to anyone: staff, suppliers, customers and people with no
          relationship to us at all.
        </p>
      </Section>

      <Section heading="What it is not for">
        <p>
          Problems with an order — a delayed delivery, a refund, a damaged item —
          are handled faster by customer service. Please use our{" "}
          <PolicyLink href="/contact">Contact</PolicyLink> page, or the grievance
          officer named there, for anything order-related.
        </p>
      </Section>

      <Section heading="How to report">
        <p>
          Write to{" "}
          <a
            href={`mailto:${LEGAL.email}?subject=Ethics report`}
            className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>{" "}
          with &quot;Ethics report&quot; in the subject line.
        </p>
        <p>
          Tell us what happened, when, and who was involved if you know. Dates,
          order numbers, names and any documents help — a report we can act on
          needs enough detail to be checked.
        </p>
      </Section>

      <Section heading="Reporting anonymously">
        <p>
          You do not have to identify yourself. You can write from an anonymous
          email account, and we will investigate on the facts you give us.
        </p>
        <p>
          Be aware of the trade-off: if we cannot reach you, we cannot ask the
          follow-up questions that often decide whether a report can be
          substantiated, and we cannot tell you what came of it.
        </p>
      </Section>

      <Section heading="What we commit to">
        <p>
          We will acknowledge a report within five working days where you have
          given us a way to reply. We will look into it. We will keep your
          identity confidential, sharing it only where we are legally required
          to.
        </p>
        <p>
          Nobody will be penalised for raising a concern in good faith, whether
          or not it turns out to be substantiated. Retaliating against someone
          who reports is itself something to report through this channel.
        </p>
      </Section>

      <Section heading="If you would rather go elsewhere">
        <p>
          You are never obliged to come to us first. Consumers can contact the
          National Consumer Helpline on 1915. Concerns about personal data can be
          raised with the Data Protection Board of India, and our{" "}
          <PolicyLink href="/privacy-policy">Privacy Policy</PolicyLink>{" "}
          explains your rights.
        </p>
      </Section>
    </LegalPage>
  )
}
