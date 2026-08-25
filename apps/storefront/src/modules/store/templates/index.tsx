import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import GridToggle from "@modules/store/components/grid-toggle"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  grid,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  grid?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const currentGrid = grid || "4"

  return (
    <div className="w-full" data-testid="category-container">

      <div className="px-4 md:px-8 pt-6 pb-2">
        {/* This route is the WHOLE catalogue -- PaginatedProducts runs with no
            category filter -- so the heading has to say so. It read "MEN'S SALE"
            for as long as the page has existed: a hardcoded leftover from
            building the men's sale page on this template, shown above a grid of
            women's, teen and kids products.

            The category submenu bar was removed for the same reason. It has no
            category to derive tabs from here, so it fell through to its
            DEFAULT_MEN_TABS fallback and rendered a men-only filter strip
            (SHIRTS, POLOS, SUITS...) over that same mixed grid. Browsing by
            section is what the header nav is for. */}
        <h1 className="text-xl md:text-2xl font-bold mb-4 tracking-wide uppercase" data-testid="store-page-title">
          All products
        </h1>

        {/* Filter & Order Header */}
        <div className="flex justify-between items-center mb-2 text-sm font-medium tracking-wide">
           <div className="flex gap-4 items-center relative z-20 group">
              <span className="nav-underline cursor-pointer uppercase text-xs lg:text-sm md:text-sm font-bold tracking-wider">Filter and order</span>
              {/* Dropdown for functional existing RefinementList */}
              <div className="absolute top-full left-0 bg-white shadow-elevation-card-rest rounded-lg p-2 hidden group-hover:block w-[300px] border border-gray-100 transition-opacity">
                <RefinementList sortBy={sort} />
              </div>
           </div>
           
           {/* Interactive Layout Toggle Icons */}
           <GridToggle currentGrid={currentGrid} />
        </div>
      </div>

      <div className="w-full">
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            grid={currentGrid}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
