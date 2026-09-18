import { Metadata } from "next"
import { LEGAL } from "@lib/legal-config"
import { LegalPage, PolicyLink, Section } from "@modules/legal/components/layout"

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Careers at Bacoola: the roles we hire for, what we look for in candidates, and how to apply to join our team.",
}

/**
 * No invented vacancies.
 *
 * A careers page listing roles that do not exist is not harmless filler: people
 * spend real time preparing applications for them. This page is complete and
 * honest instead -- it says how to apply speculatively, which is true and
 * actionable today, and needs only a list added when roles actually open.
 */
export default function CareersPage() {
  return (
    <LegalPage
      title="Work for Bacoola"
      showUpdated={false}
      intro="We are a small team, and we hire rarely — but we always read what comes in."
    >
      <Section heading="Open roles">
        <p>
          We have no published vacancies at the moment. When we do, they will be
          listed on this page.
        </p>
        <p>
          That does not mean we are not hiring. Most of the people who work here
          got in touch before a role existed, so a speculative application is
          worth sending.
        </p>
      </Section>

      <Section heading="How to apply">
        <p>
          Write to{" "}
          <a
            href={`mailto:${LEGAL.email}?subject=Application`}
            className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>{" "}
          with &quot;Application&quot; in the subject line. Tell us what you do,
          what you would want to work on here, and attach whatever best shows
          your work — a CV, a portfolio, a repository, a lookbook.
        </p>
        <p>
          We read everything that arrives. We reply when there is something to
          say, which is not always quickly, and not always yes.
        </p>
      </Section>

      <Section heading="What we look for">
        <p>
          People who finish things. Most of what we do is unglamorous — sizing
          consistency, photography, getting orders out on time — and it is done
          well by people who care whether the details are right rather than
          whether the work is visible.
        </p>
      </Section>

      <Section heading="How we handle your application">
        <p>
          A CV is personal data. We use it only to consider you for a role, we
          do not share it outside the company, and you can ask us to delete it
          at any time by writing to the same address. Our{" "}
          <PolicyLink href="/privacy-policy">Privacy Policy</PolicyLink>{" "}
          explains the rest.
        </p>
      </Section>
    </LegalPage>
  )
}
