// @ts-nocheck
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { Link } from "react-router-dom"

export const config = defineRouteConfig({
  label: "Landing Pages",
  icon: DocumentText,
})

const pages = [
  { id: "home", label: "Home" },
  { id: "men", label: "Men" },
  { id: "women", label: "Women" },
  { id: "kids", label: "Kids" },
  { id: "teen", label: "Teen" },
]

export default function LandingPagesPage() {
  return (
    <Container className="p-4 lg:p-8">
      <div className="flex flex-col gap-4">
        <Heading level="h1">Landing Pages CMS</Heading>
        <Text className="text-ui-fg-subtle">
          Manage the content for your storefront landing pages.
        </Text>

        {/* flex-wrap so the page buttons wrap onto multiple rows on phone widths
            instead of overflowing off-screen (Kids/Teen were being clipped).
            Harmless on desktop, where they already fit on one line. */}
        <div className="flex flex-wrap gap-3 mt-4">
          {pages.map((page) => (
            <Link key={page.id} to={`/content/landing-pages/${page.id}`}>
              <Button variant="secondary">
                {page.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  )
}
