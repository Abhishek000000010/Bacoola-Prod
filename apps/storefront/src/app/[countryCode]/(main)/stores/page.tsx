import { Metadata } from "next"
import { STORES } from "@lib/legal-config"
import StoreLocator from "@modules/stores/components/store-locator"

export const metadata: Metadata = {
  title: "Locate your store",
  description:
    "Find your nearest Bacoola store, with address, opening hours and directions.",
}

/**
 * Full-bleed, unlike the policy pages.
 *
 * This page deliberately does NOT use the LegalPage wrapper: that centres its
 * children in a max-w-4xl column, which is right for a wall of legal text and
 * wrong for a locator. It squeezed the map into roughly a third of the screen
 * with dead margin either side. A map wants width.
 *
 * The page is the locator and nothing else. It previously carried "Shopping
 * online", "Returns" and "Contact" sections underneath; they duplicated the
 * footer and the Contact page, and pushed a wall of text under a map that had
 * already answered the question the visitor came with.
 *
 * Store data lives in legal-config's STORES array. Adding the second store is
 * one entry; the search, the list and the map all follow from it.
 */
export default function StoresPage() {
  return (
    <div className="bg-white pt-8 pb-12">
      <h1 className="px-4 md:px-8 lg:px-10 text-[15px] font-bold uppercase tracking-wide text-neutral-950 mb-6">
        Locate your store
      </h1>

      <StoreLocator stores={STORES} />
    </div>
  )
}
