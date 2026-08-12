"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import CategoryFilterDrawer from "../components/category-filter-drawer"
import { getCategoryFacets } from "@lib/data/category-facets"
import { CardFacet, FacetIndex } from "@lib/util/product-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

/**
 * Just the header crumb, not the category.
 *
 * A `StoreProductCategory` carries `category_children` and a `parent_category`
 * chain, so handing one to a client component serialises a whole subtree into
 * the page -- on /categories/men that was 1185 category records to render a
 * breadcrumb and a heading. Callers pass these fields and nothing else.
 */
export type CategoryCrumb = {
  id: string
  name?: string | null
  handle?: string | null
}

interface CategoryProductListingProps {
  category: CategoryCrumb
  parents: CategoryCrumb[]
  /** Defaults to just this category when the caller has no wider set. */
  categoryIds?: string[]
  countryCode?: string
  sortBy?: SortOptions
  children: React.ReactNode
}

export default function CategoryProductListing({
  category,
  parents,
  categoryIds,
  countryCode,
  sortBy = "created_at",
  children,
}: CategoryProductListingProps) {
  // Stable identity: a fresh array each render would retrigger the fetch effect.
  const facetCategoryIds = useMemo(
    () => (categoryIds?.length ? categoryIds : [category.id]),
    [categoryIds, category.id]
  )
  const [cols, setCols] = useState<2 | 4 | 6>(4)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Phones default to the single-column ("first") layout; the 4-up desktop
  // default is left as-is. Starting at 4 keeps the server markup and the first
  // client render identical (no hydration mismatch), then this nudges phones to
  // one-per-row on mount. Guarded to < 640px so desktop and tablet are untouched.
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) {
      setCols(2)
    }
  }, [])
  const [facetData, setFacetData] = useState<{
    facetIndex: FacetIndex
    facets: CardFacet[]
  } | null>(null)

  // Facets need every product in the category, so they are fetched the first
  // time the drawer is opened rather than on page load.
  //
  // "Have we started?" is a ref, not state, on purpose: as state it would be
  // both a guard and a dependency, so setting it re-ran the effect, and that
  // re-run's cleanup cancelled the in-flight request before its result could be
  // stored -- leaving the panel on its skeleton forever.
  const facetsRequested = useRef(false)

  useEffect(() => {
    if (!isFilterOpen || facetsRequested.current || !countryCode) return

    facetsRequested.current = true
    let cancelled = false

    getCategoryFacets({ categoryIds: facetCategoryIds, countryCode })
      .then((data) => {
        if (!cancelled) setFacetData(data)
      })
      .catch(() => {
        // Allow a retry on the next open rather than wedging on the skeleton.
        facetsRequested.current = false
      })

    return () => {
      cancelled = true
    }
  }, [isFilterOpen, facetCategoryIds, countryCode])

  return (
    <div className="relative w-full min-h-screen bg-white text-black font-sans pb-16 overflow-x-hidden">

      {/* Top Header / Control Bar */}
      <div className="w-full pt-4 md:pt-6 pb-2 px-4 sm:px-12 flex justify-between items-center select-none bg-white">
        <div className="flex gap-x-8 items-center">
          {/* Breadcrumbs and Title (Hidden on mobile) */}
          <div className="hidden md:flex flex-wrap items-center gap-x-2 text-[12px] lg:text-[14px] font-bold tracking-wider leading-none uppercase text-[#111111]">
            {parents &&
              parents.map((parent) => (
                <span key={parent.id} className="text-neutral-400 flex items-center">
                  <LocalizedClientLink href={`/categories/${parent.handle}`} className="hover:text-black transition-colors">
                    {parent.name}
                  </LocalizedClientLink>
                  <span className="mx-2">/</span>
                </span>
              ))}
            <span>{category.name}</span>
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className="text-[12px] lg:text-[14px] leading-none font-bold uppercase tracking-wider text-black hover:text-neutral-500 transition-colors duration-200"
          >
            FILTER AND ORDER
          </button>
        </div>

        {/* 2, 4, or 6 Column Layout controls */}
        <div className="flex gap-x-3 items-center">
          <button
            onClick={() => setCols(2)}
            className={`p-1.5 focus:outline-none flex flex-col items-center transition-colors duration-200 ${
              cols === 2 ? "text-black" : "text-neutral-400 hover:text-neutral-600"
            }`}
            aria-label="2 Columns Layout"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="1" width="16" height="16" />
            </svg>
            <div className={`w-[22px] h-[1.5px] mt-[6px] ${cols === 2 ? "bg-black" : "bg-transparent"}`} />
          </button>

          <button
            onClick={() => setCols(4)}
            className={`p-1.5 focus:outline-none flex flex-col items-center transition-colors duration-200 ${
              cols === 4 ? "text-black" : "text-neutral-400 hover:text-neutral-600"
            }`}
            aria-label="4 Columns Layout"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="1" width="16" height="16" />
              <line x1="9" y1="1" x2="9" y2="17" />
            </svg>
            <div className={`w-[22px] h-[1.5px] mt-[6px] ${cols === 4 ? "bg-black" : "bg-transparent"}`} />
          </button>

          <button
            onClick={() => setCols(6)}
            className={`p-1.5 focus:outline-none flex flex-col items-center transition-colors duration-200 ${
              cols === 6 ? "text-black" : "text-neutral-400 hover:text-neutral-600"
            }`}
            aria-label="6 Columns Layout"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="1" width="16" height="16" />
              <line x1="9" y1="1" x2="9" y2="17" />
              <line x1="1" y1="9" x2="17" y2="9" />
            </svg>
            <div className={`w-[22px] h-[1.5px] mt-[6px] ${cols === 6 ? "bg-black" : "bg-transparent"}`} />
          </button>
        </div>
      </div>

      {/* Grid Container wrapping children paginated lists */}
      <div className="px-0 pb-6 sm:pb-10 pt-0 w-full">
        <div
          className={`transition-all duration-300 ${
            cols === 2
              ? "[&_ul]:!grid-cols-1 sm:[&_ul]:!grid-cols-2 small:[&_ul]:!grid-cols-2 [&_ul]:!gap-x-[2px] [&_ul]:!gap-y-12 [&_.pp-m-add-btn]:!flex sm:[&_.pp-m-add-btn]:!hidden [&_.pp-plus]:!hidden sm:[&_.pp-plus]:!flex small:[&_.pp-plus]:!hidden"
              : cols === 4
              ? "[&_ul]:!grid-cols-2 sm:[&_ul]:!grid-cols-3 lg:[&_ul]:!grid-cols-4 [&_ul]:!gap-x-[2px] [&_ul]:!gap-y-12"
              : "[&_ul]:!grid-cols-3 sm:[&_ul]:!grid-cols-4 lg:[&_ul]:!grid-cols-6 [&_ul]:!gap-x-[2px] [&_ul]:!gap-y-[2px] [&_.pp-d-details]:!hidden [&_.pp-m-details]:!hidden [&_.pp-plus]:!hidden"
          }`}
        >
          {children}
        </div>
      </div>

      {/* Slide-out Filters Panel Drawer */}
      {facetData ? (
        <CategoryFilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          facetIndex={facetData.facetIndex}
          facets={facetData.facets}
          sortBy={sortBy}
        />
      ) : (
        <FilterDrawerSkeleton
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />
      )}
    </div>
  )
}

/**
 * Shown while the category's facets are still loading, so the panel slides in
 * immediately on click instead of waiting on the request.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FilterDrawerSkeleton({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/15 backdrop-blur-[2px] z-[9998] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-white border-l border-neutral-100 z-[9999] shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex pl-8 pr-6 py-6 items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[#111111]">
            FILTER AND ORDER
          </h2>
        </div>
        <div className="flex-1 px-8 flex flex-col gap-y-6 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-full animate-pulse bg-neutral-100" />
          ))}
        </div>
      </div>
    </>
  )
}

