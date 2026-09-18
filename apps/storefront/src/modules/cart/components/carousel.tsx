"use client"

import React, { useRef, useState } from "react"
import Image from "next/image"
import { Heart, ChevronLeft, ChevronRight } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"

interface CarouselProps {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
}

import WishlistButton from "@modules/common/components/wishlist-button"

export const Carousel: React.FC<CarouselProps> = ({ products, region }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  if (!products || products.length === 0) return null

  const handleScroll = (direction: "left" | "right") => {
    const el = containerRef.current
    if (!el) return
    // Advance by a single card width so one arrow tap moves one product.
    const firstCard = el.querySelector<HTMLElement>("[data-carousel-card]")
    const scrollAmount = firstCard?.offsetWidth ?? el.clientWidth * 0.25
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  return (
    <div className="w-full mt-24 mb-16 px-0">
      {/* Header with scroll controls */}
      <div className="flex justify-between items-center mb-6 pl-4 lg:pl-6 pr-4 lg:pr-6">
        <h3 className="text-[12px] lg:text-[14px] font-semibold uppercase tracking-wide text-neutral-900">
          MAY INTEREST YOU
        </h3>
        <div className="flex gap-x-4">
          <button
            onClick={() => handleScroll("left")}
            className="text-black hover:text-neutral-600 transition-colors focus:outline-none"
            aria-label="Scroll left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <button
            onClick={() => handleScroll("right")}
            className="text-black hover:text-neutral-600 transition-colors focus:outline-none"
            aria-label="Scroll right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Horizontal Scroll container */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => {
          const { cheapestPrice } = getProductPrice({ product })
          const thumbnail = product.thumbnail || "/images/campaign-1.jpg"

          // Try to extract sizes
          const sizes = product.options?.find(
            (o: any) => o.title?.toLowerCase() === "size" || o.title?.toLowerCase() === "sizes"
          )?.values?.map((v: any) => v.value) || []

          return (
            <div
              key={product.id}
              data-carousel-card
              className="min-w-[240px] w-[240px] sm:min-w-[280px] sm:w-[280px] snap-start group flex flex-col relative"
            >
              {/* Image Wrap */}
              <div
                className="relative w-full overflow-hidden bg-neutral-100"
                style={{ aspectRatio: "3 / 4" }}
              >
                <LocalizedClientLink href={`/products/${product.handle}`} className="block w-full h-full">
                  <Image
                    src={thumbnail}
                    alt={product.title || "Product"}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 640px) 240px, 280px"
                  />
                </LocalizedClientLink>

                {/* Sizes slide up on hover */}
                {sizes.length > 0 && (
                  <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out py-3 px-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                    {sizes.map((size: string) => (
                      <LocalizedClientLink
                        key={size}
                        href={`/products/${product.handle}`}
                        className="text-[12px] lg:text-[14px] text-neutral-700 hover:text-black transition-colors"
                      >
                        {size}
                      </LocalizedClientLink>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="mt-2 w-full px-2">
                <div className="flex items-center justify-between gap-x-2">
                  <LocalizedClientLink href={`/products/${product.handle}`} className="flex-1">
                    <h4 className="text-[12px] lg:text-[14px] font-normal text-neutral-900 leading-snug line-clamp-1 group-hover:text-black">
                      {product.title}
                    </h4>
                  </LocalizedClientLink>
                  <div className="shrink-0">
                    <WishlistButton
                      product={product}
                      className="text-neutral-400 hover:text-black transition-colors"
                      iconClassName="w-5 h-5"
                    />
                  </div>
                </div>

                {/* Price */}
                {cheapestPrice ? (
                  <div className="mt-0.5 text-[12px] lg:text-[14px] font-normal text-neutral-900">
                    {cheapestPrice.price_type === "sale" && (
                      <span className="line-through text-neutral-400 mr-2">
                        {cheapestPrice.original_price}
                      </span>
                    )}
                    <span className={cheapestPrice.price_type === "sale" ? "text-sale font-semibold" : ""}>
                      {cheapestPrice.calculated_price}
                    </span>
                  </div>
                ) : (
                  <span className="mt-0.5 text-[12px] lg:text-[14px] text-neutral-400">Pricing unavailable</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Carousel
