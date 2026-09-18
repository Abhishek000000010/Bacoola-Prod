"use client"

import React from "react"
import { usePathname } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

interface CategorySubmenuBarProps {
  category?: HttpTypes.StoreProductCategory
  subcategories?: HttpTypes.StoreProductCategory[]
  parentHandle?: string
}

const DEFAULT_MEN_TABS = [
  { name: "ALL", handle: "men" },
  { name: "SHIRTS", handle: "men-shirts" },
  { name: "TROUSERS", handle: "men-trousers" },
  { name: "POLOS", handle: "men-polos" },
  { name: "T-SHIRTS", handle: "men-t-shirts" },
  { name: "SUITS", handle: "men-suits" },
  { name: "ACCESSORIES", handle: "men-accessories" },
  { name: "LINEN", handle: "men-linen" },
  { name: "JEANS", handle: "men-jeans" },
  { name: "SHORTS", handle: "men-shorts" },
  { name: "SWIMWEAR", handle: "men-swimwear" },
]

export default function CategorySubmenuBar({
  category,
  subcategories,
  parentHandle,
}: CategorySubmenuBarProps) {
  const pathname = usePathname()

  // Clean pathname to get handle (e.g. "/in/categories/men-shirts" -> "men-shirts")
  const segments = pathname?.split("/").filter(Boolean) || []
  const cleanSegments =
    segments.length > 0 && segments[0].length === 2 ? segments.slice(1) : segments
  
  const currentHandle =
    cleanSegments[0] === "categories" && cleanSegments[1]
      ? cleanSegments[1].toLowerCase()
      : ""

  // Generate tab list dynamically:
  // If current category has children (parent page) or has a parent category (child page),
  // keep the EXACT same tab list so the menu bar doesn't change when clicking subcategories!
  let tabs: { name: string; handle: string }[] = []

  if (category?.category_children && category.category_children.length > 0) {
    // Current category is a parent category (e.g. "women-sale-40-v2" or "men")
    tabs = [
      { name: "ALL", handle: category.handle },
      ...category.category_children.map((child) => ({
        name: child.name.toUpperCase(),
        handle: child.handle,
      })),
    ]
  } else if (category?.parent_category?.category_children && category.parent_category.category_children.length > 0) {
    // Current category is a child subcategory (e.g. "ws-v2-jeans" or "men-shirts")
    // Use parent category's children so menu bar stays IDENTICAL to parent page!
    tabs = [
      { name: "ALL", handle: category.parent_category.handle },
      ...category.parent_category.category_children.map((child) => ({
        name: child.name.toUpperCase(),
        handle: child.handle,
      })),
    ]
  } else if (subcategories && subcategories.length > 0) {
    const rootHandle = parentHandle || (category ? category.handle : "men")
    tabs = [
      { name: "ALL", handle: rootHandle },
      ...subcategories.map((sc) => ({
        name: sc.name.toUpperCase(),
        handle: sc.handle,
      })),
    ]
  } else if (currentHandle.startsWith("ws-v2-") || currentHandle.includes("women-sale") || currentHandle.includes("women")) {
    // Fallback for Women's Sale subcategories: Keep the exact Women's Sale menu items (Image 1)!
    tabs = [
      { name: "ALL", handle: "women-sale-40-v2" },
      { name: "SEE ALL", handle: "women-sale-40-v2" },
      { name: "DRESSES AND JUMPSUITS", handle: "ws-v2-dresses" },
      { name: "TROUSERS", handle: "ws-v2-trousers" },
      { name: "JEANS", handle: "ws-v2-jeans" },
      { name: "TOPS", handle: "ws-v2-tops" },
      { name: "SHIRTS & BLOUSES", handle: "ws-v2-shirts" },
      { name: "BAGS", handle: "ws-v2-bags" },
      { name: "SKIRTS", handle: "ws-v2-skirts" },
      { name: "SHORTS AND BERMUDA SHORTS", handle: "ws-v2-shorts" },
      { name: "LINEN", handle: "ws-v2-linen" },
      { name: "TOTAL LOOK", handle: "ws-v2-totallook" },
    ]
  } else {
    tabs = DEFAULT_MEN_TABS
  }

  return (
    <div className="w-full bg-white border-b border-neutral-200 select-none">
      <div className="max-w-[1550px] mx-auto px-4 md:px-8 py-3">
        <div className="flex overflow-x-auto gap-8 text-xs md:text-sm font-semibold tracking-wider text-gray-500 uppercase whitespace-nowrap scrollbar-none">
          {tabs.map((tab) => {
            const isAllTab = tab.name === "ALL"
            const isActive = isAllTab
              ? currentHandle === tab.handle || (pathname === "/store" && tab.handle === "men")
              : currentHandle === tab.handle || currentHandle.endsWith(`-${tab.name.toLowerCase()}`)

            return (
              <LocalizedClientLink
                key={tab.handle + tab.name}
                href={tab.handle === "store" ? "/store" : `/categories/${tab.handle}`}
                className={`transition-colors py-1 cursor-pointer hover:text-black ${
                  isActive
                    ? "text-black border-b border-black font-bold"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                {tab.name}
              </LocalizedClientLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}
