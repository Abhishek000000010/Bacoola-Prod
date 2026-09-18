"use client"

import React, { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"
import MegaMenu from "../navigation/MegaMenu"

const NAV_LINKS = [
  { label: "Women", href: "/landingpage/women", key: "women" },
  { label: "Men", href: "/landingpage/men", key: "men" },
  { label: "Teen", href: "/landingpage/teen", key: "teen" },
  { label: "Kids", href: "/landingpage/kids", key: "kids" },
]

import { HttpTypes } from "@medusajs/types"
export const HeaderLinks: React.FC<{ categories?: HttpTypes.StoreProductCategory[] }> = ({ categories = [] }) => {
  const pathname = usePathname()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // This nav lives in a statically-rendered layout, so on the server
  // `usePathname()` can't resolve the current category and the section highlight
  // would differ from the client's -> a hydration mismatch. Apply the
  // pathname-derived underline only after mount so the first client render
  // matches the server (nothing highlighted), then lights the right section.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Resolve which top-level section (women/men/teen/kids) the current URL sits
  // under, so the underline stays lit while browsing that section -- not only on
  // the /landingpage/<section> pages. Category pages live at /categories/<handle>
  // and chain up via parent_category_id to a root whose handle is the section key.
  const activeSectionKey = React.useMemo<string | null>(() => {
    if (!pathname) return null

    // Normalize path by stripping the locale code (e.g. "/us/categories/men" -> "/categories/men")
    const segments = pathname.split("/").filter(Boolean)
    const cleanSegments =
      segments.length > 0 && segments[0].length === 2 ? segments.slice(1) : segments

    // /landingpage/<section>
    if (cleanSegments[0] === "landingpage" && cleanSegments[1]) {
      return cleanSegments[1]
    }

    // /categories/<handle> -> walk up to the root category's handle
    if (cleanSegments[0] === "categories" && cleanSegments[1]) {
      const byHandle = new Map(categories.map((c) => [c.handle, c]))
      const byId = new Map(categories.map((c) => [c.id, c]))
      let current = byHandle.get(cleanSegments[1])
      // Guard against cycles/missing data with a bounded walk.
      for (let i = 0; current && i < 10; i++) {
        if (!current.parent_category_id) return current.handle ?? null
        current = byId.get(current.parent_category_id)
      }
    }

    return null
  }, [pathname, categories])

  // Handle cursor entering a link trigger
  const handleMouseEnter = (key: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setActiveCategory(key)
  }

  // Handle cursor leaving a link trigger
  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setActiveCategory(null)
    }, 150) // small delay to allow cursor to reach the menu dropdown
  }

  // Handle cursor entering the mega menu dropdown directly
  const handleMenuMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  // Handle cursor leaving the mega menu dropdown
  const handleMenuMouseLeave = () => {
    setActiveCategory(null)
  }

  return (
    <div className="flex items-center gap-x-[20px] h-full relative">
      {NAV_LINKS.map(({ label, href, key }) => {
        const active = mounted && activeSectionKey === key
        const isHighlighted = activeCategory ? activeCategory === key : active

        return (
          <div
            key={label}
            onMouseEnter={() => handleMouseEnter(key)}
            onMouseLeave={handleMouseLeave}
            className="h-full flex items-center relative z-[1000]"
          >
            <LocalizedClientLink
              href={href}
              className={clx(
                "h-full flex items-center text-[12px] leading-none font-semibold uppercase tracking-wider transition-colors duration-200 focus:outline-none group",
                active ? "text-[#111111]" : "text-[#111111] hover:text-[#555555]"
              )}
            >
              {/* Shared .nav-underline (Mango-style fade). nav-underline-active
                  keeps the line lit while the mega menu is open; :hover covers
                  the rest. No vertical padding on the span so the line hugs the
                  text at the same ~4px gap as the Search/Bag links. */}
              <span
                className={clx(
                  "nav-underline",
                  isHighlighted && "nav-underline-active"
                )}
              >
                {label}
              </span>
            </LocalizedClientLink>
          </div>
        )
      })}

      {/* Render the Dropdown Panel below Navbar */}
      <MegaMenu
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onMouseEnter={handleMenuMouseEnter}
        onMouseLeave={handleMenuMouseLeave}
        categories={categories}
      />
    </div>
  )
}

export default HeaderLinks
