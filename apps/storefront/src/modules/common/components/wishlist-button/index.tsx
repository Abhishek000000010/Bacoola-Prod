"use client"

import React, { useState, useEffect } from "react"
import { HttpTypes } from "@medusajs/types"
import { VariantCard } from "@lib/util/variant-cards"
import { isItemInWishlist, toggleWishlistItem, wishlistKey } from "@lib/util/wishlist"

interface WishlistButtonProps {
  product: HttpTypes.StoreProduct
  /**
   * The colourway this heart belongs to. Listing tiles pass one per colour so
   * each heart toggles independently; whole-product buttons omit it.
   */
  card?: VariantCard
  className?: string
  iconClassName?: string
}

export default function WishlistButton({
  product,
  card,
  className = "",
  iconClassName = "w-4 h-4",
}: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const key = product?.id ? wishlistKey(product, card) : undefined

  useEffect(() => {
    if (!key) return
    setIsWishlisted(isItemInWishlist(key))

    const handleWishlistUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.key === key) {
        setIsWishlisted(customEvent.detail.isWishlisted)
      } else {
        setIsWishlisted(isItemInWishlist(key))
      }
    }

    window.addEventListener("wishlist-updated", handleWishlistUpdate)
    return () => {
      window.removeEventListener("wishlist-updated", handleWishlistUpdate)
    }
  }, [key])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product) return
    const newState = toggleWishlistItem(product, card)
    setIsWishlisted(newState)
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`focus:outline-none p-1 ${className}`}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        strokeWidth={isWishlisted ? 0 : 1.5}
        stroke="currentColor"
        className={`${iconClassName} transition-colors duration-200 ${
          isWishlisted
            ? "fill-current"
            : "fill-none text-gray-900 hover:text-black"
        }`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  )
}
