import { Metadata } from "next"
import { LEGAL } from "@lib/legal-config"
import { LegalPage, PolicyLink, Section } from "@modules/legal/components/layout"

export const metadata: Metadata = {
  title: "Press & Media",
  description:
    "Press and media enquiries for Bacoola, including interviews, brand assets and image requests.",
}

/**
 * A press CONTACT page, not a press COVERAGE page.
 *
 * Inventing "as featured in" logos or pull-quotes would attribute statements to
 * real publications that never made them -- a fabricated record, and one that is
 * trivially checkable by any journalist who lands here. What a press page has to
 * do on day one is route an enquiry to a human, and this does that.
 */
export default function PressPage() {
  return (
    <LegalPage
      title="Press"
      showUpdated={false}
      intro="For interviews, product loans, imagery or comment, this is the fastest route to us."
    >
      <Section heading="Press enquiries">
        <p>
          Write to{" "}
          <a
            href={`mailto:${LEGAL.email}?subject=Press enquiry`}
            className="font-bold underline underline-offset-[3px] decoration-1 text-neutral-950 hover:text-neutral-500 transition-colors"
          >
            {LEGAL.email}
          </a>{" "}
          with &quot;Press enquiry&quot; in the subject line, or call{" "}
          {LEGAL.phone}.
        </p>
        <p>
          If you are working to a deadline, say so in the first line and we will
          prioritise accordingly.
        </p>
      </Section>

      <Section heading="Brand assets">
        <p>
          Logos, product photography and collection imagery are available on
          request. Please tell us what you need and where it will be published,
          and we will send the appropriate files.
        </p>
        <p>
          Our imagery and logo are covered by the intellectual property terms in
          our{" "}
          <PolicyLink href="/terms-and-conditions">
            Terms and Conditions
          </PolicyLink>
          . Editorial use with attribution is welcome; commercial reuse needs our
          written permission.
        </p>
      </Section>

      <Section heading="Product loans">
        <p>
          We consider requests for shoots and features. Include the publication,
          the shoot date, the pieces you are after and the return date.
        </p>
      </Section>

      <Section heading="Company information">
        <p>
          Registered details, including the legal entity and registration
          numbers, are published on our{" "}
          <PolicyLink href="/company">Company</PolicyLink> page.
        </p>
      </Section>
    </LegalPage>
  )
}
