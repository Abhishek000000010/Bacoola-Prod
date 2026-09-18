import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getDepartment, SITE_NAME } from "@lib/util/seo"
import { getLandingSections } from "@lib/data/landing-pages"
import { getCategoryByHandle } from "@lib/data/categories"
import LandingRenderer from "@modules/home/components/landing-renderer"
import SubcategorySlider from "@modules/categories/components/subcategory-slider"

type Props = {
  params: Promise<{
    countryCode: string
    section: string
  }>
}

const VALID_SECTIONS = ["men", "women", "teen", "kids", "home"]

const LANDING_DESCRIPTIONS: Record<string, string> = {
  women:
    "Shop women's fashion at Bacoola: new-season dresses, tops, trousers, jeans, shoes and accessories. Timeless essentials, delivered across India.",
  men:
    "Shop men's fashion at Bacoola: shirts, T-shirts, trousers, jeans, jackets, shoes and accessories. Modern essentials, delivered across India.",
  teen:
    "Shop teen fashion at Bacoola: the latest clothing, shoes and accessories for teens, from everyday basics to statement pieces. Delivered across India.",
  kids:
    "Shop kids' clothing at Bacoola: comfortable, durable everyday outfits, shoes and accessories for boys and girls. Delivered across India.",
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode, section } = await props.params
  const key = section?.toLowerCase()
  const department = getDepartment(key)

  // "home" duplicates the home page; send search engines there instead.
  if (!department) {
    return { alternates: { canonical: `/${countryCode}` } }
  }

  return {
    title: `${department.possessive} Clothing & Accessories`,
    description: LANDING_DESCRIPTIONS[key],
    alternates: { canonical: `/${countryCode}/landingpage/${key}` },
    openGraph: {
      title: `${department.possessive} Clothing & Accessories | ${SITE_NAME}`,
      description: LANDING_DESCRIPTIONS[key],
      siteName: SITE_NAME,
      type: "website",
      locale: "en_IN",
    },
  }
}

export default async function LandingPage(props: Props) {
  const params = await props.params
  const section = params.section?.toLowerCase()

  if (!section || !VALID_SECTIONS.includes(section)) {
    notFound()
  }

  const [sections, category] = await Promise.all([
    getLandingSections(section),
    getCategoryByHandle([section]),
  ])

  return (
    <main className="w-full min-h-screen bg-white">
      <LandingRenderer
        sections={sections}
        pageName={section}
        preFooter={category ? <SubcategorySlider category={category} /> : null}
      />
    </main>
  )
}
