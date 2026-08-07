"use client"

import React, { useState, useEffect } from "react"
import { HttpTypes } from "@medusajs/types"
import { getWishlist, WishlistEntry } from "@lib/util/wishlist"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface WishlistClientProps {
  region: HttpTypes.StoreRegion
  popularProducts: HttpTypes.StoreProduct[]
}

export default function WishlistClient({
  region,
  popularProducts,
}: WishlistClientProps) {
  const [wishlistItems, setWishlistItems] = useState<WishlistEntry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const syncWishlist = () => {
    setWishlistItems(getWishlist())
    setIsLoaded(true)
  }

  useEffect(() => {
    syncWishlist()

    const handleWishlistUpdate = () => {
      syncWishlist()
    }

    window.addEventListener("wishlist-updated", handleWishlistUpdate)
    return () => {
      window.removeEventListener("wishlist-updated", handleWishlistUpdate)
    }
  }, [])

  if (!isLoaded) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col font-sans text-[#111111] pb-24">
      {/* Top Header Section */}
      <div className="w-full px-4 sm:px-8 pt-8 pb-4 flex flex-col items-start select-none">
        <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
          MY WISHLIST
        </h1>
        <p className="text-[12px] lg:text-[14px] text-black mt-1 font-normal tracking-wide">
          These are the items you liked the most
        </p>
      </div>

      {wishlistItems.length > 0 ? (
        /* Saved Wishlist Items Grid */
        <div className="w-full px-0 sm:px-8 py-4 max-w-[1550px]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-2">
            {wishlistItems.map((entry) => (
              <ProductPreview
                key={entry.key}
                product={entry.product}
                card={entry.card}
                region={region}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Empty State Section */
        <div className="w-full flex flex-col items-center justify-center pt-20 pb-24 px-6">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-neutral-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </div>
          <h2 className="text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] mb-4">
            Your Wishlist is Empty
          </h2>
          <p className="text-[12px] lg:text-[14px] text-neutral-500 tracking-wide mb-6 text-center max-w-sm">
            Save your favorite items by tapping the heart icon on any product.
          </p>

          <LocalizedClientLink
            href="/store"
            className="px-8 py-3 border border-black bg-black text-white text-xs lg:text-sm font-semibold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors"
          >
            BROWSE PRODUCTS
          </LocalizedClientLink>
        </div>
      )}


    </div>
  )
}
