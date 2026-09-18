"use client"

import { useState } from "react"
import { Newsreader } from "next/font/google"

import CloudinaryImage from "@modules/common/components/cloudinary-image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-hero-serif",
})

/**
 * One entry per root section. The first one is what shows on load; hovering
 * (or focusing) a link crossfades the background to that section's image, and
 * it stays there until another link is hovered.
 */
const SECTIONS = [
  { key: "women", label: "Women", href: "/landingpage/women", image: "/images/hero-vacation.jpg" },
  { key: "men", label: "Men", href: "/landingpage/men", image: "/images/hero-arrivals.jpg" },
  { key: "teen", label: "Teen", href: "/landingpage/teen", image: "/images/campaign-8.jpg" },
  { key: "kids", label: "Kids", href: "/landingpage/kids", image: "/images/campaign-4.jpg" },
]

/** Full-bleed home hero: a serif headline over a section-switching backdrop. */
export default function SectionHero() {
  // null until the visitor hovers a link: the first image shows, but no link is
  // underlined yet.
  const [hovered, setHovered] = useState<string | null>(null)
  const active = hovered ?? SECTIONS[0].key

  return (
    <section
      className="relative w-full h-[calc(100svh-56px)] min-h-[520px] overflow-hidden bg-neutral-200 text-white"
      aria-label="Shop by section"
    >
      {/* Every image is mounted up front so the crossfade never waits on a fetch. */}
      {SECTIONS.map((section, index) => (
        <div
          key={section.key}
          aria-hidden={section.key !== active}
          className={`absolute inset-0 flex [&>picture]:w-full [&>picture]:h-full transition-opacity duration-700 ease-out ${
            section.key === active ? "opacity-100" : "opacity-0"
          }`}
        >
          <CloudinaryImage
            src={section.image}
            alt=""
            priority={index === 0}
            className="h-full w-full object-cover object-center"
          />
        </div>
      ))}

      {/* A light scrim keeps white type legible on pale images without visibly darkening the photo. */}
      <div className="absolute inset-0 bg-black/10" aria-hidden />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        <h1
          // globals.css pins every element to MangoNew with `* { ... !important }`,
          // so the serif has to be forced on the heading and the <em> inside it.
          className={`${serif.variable} ![font-family:var(--font-hero-serif),serif] font-normal leading-[0.95] tracking-[-0.01em] text-[clamp(44px,7.4vw,140px)] select-none`}
        >
          Modern essentials
          <br />
          &amp; <em className="italic ![font-family:var(--font-hero-serif),serif]">luxury</em> couture
        </h1>

        <nav
          aria-label="Sections"
          className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-x-8 sm:gap-x-12 gap-y-3"
        >
          {SECTIONS.map((section) => (
            <LocalizedClientLink
              key={section.key}
              href={section.href}
              onMouseEnter={() => setHovered(section.key)}
              onFocus={() => setHovered(section.key)}
              className={`relative pb-1 text-[12px] font-bold uppercase leading-none tracking-[0.02em] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white after:transition-transform after:duration-300 after:origin-left ${
                section.key === hovered ? "after:scale-x-100" : "after:scale-x-0"
              }`}
            >
              {section.label}
            </LocalizedClientLink>
          ))}
        </nav>
      </div>
    </section>
  )
}
