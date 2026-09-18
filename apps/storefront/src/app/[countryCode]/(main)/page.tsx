import { Metadata } from "next"

import SectionHero from "@modules/home/components/section-hero"

import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: { absolute: "Bacoola | Modern Essentials & Luxury Couture" },
  description:
    "Discover Bacoola's timeless essentials and modern luxury fashion for women, men, teens and kids. Shop new arrivals online with delivery across India.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const [region, { collections }] = await Promise.all([
    getRegion(countryCode),
    listCollections({
      fields: "id, handle, title",
    }),
  ])

  if (!collections || !region) {
    return null
  }

  // One full-bleed hero and nothing else: the page goes straight from it to
  // the newsletter sign-up and footer.
  return <SectionHero />
}


