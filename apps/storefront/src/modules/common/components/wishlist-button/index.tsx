"use client"

import React, { useState, useEffect } from "react"
import { HttpTypes } from "@medusajs/types"
import { isItemInWishlist, toggleWishlistItem } from "@lib/util/wishlist"

interface WishlistButtonProps {
  product: HttpTypes.StoreProduct
  className?: string
  iconClassName?: string
}

export default function WishlistButton({
  product,
  className = "",
  iconClassName = "w-4 h-4",
}: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(false)

  useEffect(() => {
    if (product?.id) {
      setIsWishlisted(isItemInWishlist(product.id))
    }

    const handleWishlistUpdate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.productId === product?.id) {
        setIsWishlisted(customEvent.detail.isWishlisted)
      } else if (product?.id) {
        setIsWishlisted(isItemInWishlist(product.id))
      }
    }

    window.addEventListener("wishlist-updated", handleWishlistUpdate)
    return () => {
      window.removeEventListener("wishlist-updated", handleWishlistUpdate)
    }
  }, [product?.id])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product) return
    const newState = toggleWishlistItem(product)
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
