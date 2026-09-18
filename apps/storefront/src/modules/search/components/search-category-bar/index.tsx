"use client"

import { clx } from "@modules/common/components/ui"
import { useRouter, useSearchParams } from "next/navigation"

export type SearchCategoryOption = {
  id: string
  name: string
  handle: string
}

export default function SearchCategoryBar({
  countryCode,
  categories,
  activeHandle: activeCategoryHandle,
}: {
  countryCode: string
  categories: SearchCategoryOption[]
  activeHandle?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCategoryClick = (handle?: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    if (handle) {
      params.set("cat", handle)
    } else {
      params.delete("cat")
    }
    router.push(`/${countryCode}/search?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="w-full flex items-center gap-x-6 overflow-x-auto whitespace-nowrap px-4 sm:px-8 xl:px-12 pt-1 pb-2 scrollbar-hide select-none bg-white">
      {/* "All" button handles the reset to just /search */}
      <button
        onClick={() => handleCategoryClick()}
        className={clx(
          "shrink-0 pb-1 text-[12px] lg:text-[14px] leading-none font-semibold uppercase tracking-wider transition-colors",
          activeCategoryHandle === "all" || !activeCategoryHandle
            ? "border-b border-black text-black"
            : "border-b border-transparent text-black hover:border-black"
        )}
      >
        All
      </button>

      {/* Map through categories */}
      {categories.map((cat) => {
        const active = activeCategoryHandle === cat.handle
        return (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.handle)}
            className={clx(
              "shrink-0 pb-1 text-[12px] lg:text-[14px] leading-none font-semibold uppercase tracking-wider transition-colors",
              active
                ? "border-b border-black text-black"
                : "border-b border-transparent text-black hover:border-black"
            )}
          >
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
