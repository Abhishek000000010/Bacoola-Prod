import { getBaseURL } from "@lib/util/env"
import { SITE_NAME } from "@lib/util/seo"
import { Metadata } from "next"
import CookieConsentBanner from "@modules/common/components/cookie-consent"
import NavigationLoader from "@modules/common/components/navigation-loader"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  // Pages set just their own name ("Cart"); the template appends the brand.
  title: {
    default: "Bacoola | Modern Essentials & Luxury Couture",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Shop Bacoola for women's, men's, teen and kids' fashion: timeless essentials and modern luxury pieces, with delivery across India.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <NavigationLoader />
        <main className="relative">{props.children}</main>
        <CookieConsentBanner />
      </body>
    </html>
  )
}
