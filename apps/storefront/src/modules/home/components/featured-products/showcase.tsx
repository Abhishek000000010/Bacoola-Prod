"use client"

import React, { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Heart } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"

interface FeaturedProductsShowcaseProps {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  title?: string
  subtitle?: string
}

import WishlistButton from "@modules/common/components/wishlist-button"

interface FeaturedProductsShowcaseProps {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  title?: string
  subtitle?: string
}

export const FeaturedProductsShowcase: React.FC<FeaturedProductsShowcaseProps> = ({
  products,
  title = "Featured Products",
  subtitle = "Handpicked essentials"
}) => {
  if (!products || products.length === 0) return null

  // Display 4 to 8 products
  const displayProducts = products.slice(0, 8)

  return (
    <section className="w-full py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-[1550px] mx-auto bg-white">
      {/* Title */}
      <div className="flex flex-col items-center mb-12 md:mb-16 text-center">
        <h2 className="text-xs lg:text-sm font-semibold tracking-[0.4em] uppercase text-neutral-400 mb-2">
          {subtitle}
        </h2>
        <p className="text-xl sm:text-2xl font-light uppercase tracking-widest text-[#111111]">
          {title}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16">
        {displayProducts.map((product, idx) => {
          const { cheapestPrice } = getProductPrice({ product })
          const categoryName = product.categories?.[0]?.name || "Collection"

          // Determine swap images
          const firstImage = product.thumbnail || "/images/campaign-1.jpg"
          const secondImage =
            product.images?.[1]?.url ||
            product.images?.[0]?.url ||
            firstImage

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: (idx % 4) * 0.1 }}
              className="group cursor-pointer flex flex-col"
            >
              <LocalizedClientLink href={`/products/${product.handle}`}>
                {/* Images Wrapper */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-50 mb-4 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                  
                  {/* Wishlist Heart Icon */}
                  <div className="absolute top-3 right-3 z-30">
                    <WishlistButton product={product} className="p-2 bg-white/80 hover:bg-white rounded-full shadow-sm" iconClassName="w-4 h-4" />
                  </div>

                  {/* First image (Thumbnail) */}
                  <Image
                    src={firstImage}
                    alt={product.title || "Product image"}
                    fill
                    className="object-cover transition-opacity duration-700 ease-in-out group-hover:opacity-0"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />

                  {/* Second image (Image swap on hover) */}
                  <Image
                    src={secondImage}
                    alt={product.title || "Product alternate image"}
                    fill
                    className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                </div>

                {/* Details */}
                <div className="flex flex-col items-start gap-y-1">
                  <span className="text-[12px] lg:text-[14px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    {categoryName}
                  </span>
                  
                  <h3 className="text-[12px] lg:text-[14px] sm:text-[12px] lg:text-[14px] font-medium text-[#111111] tracking-wide group-hover:text-[#555555] transition-colors duration-200">
                    {product.title}
                  </h3>

                  {/* Price */}
                  {cheapestPrice ? (
                    <div className="flex items-center gap-x-2 mt-1 text-[12px] lg:text-[14px] sm:text-[12px] lg:text-[14px]">
                      {cheapestPrice.price_type === "sale" && (
                        <span className="line-through text-neutral-400">
                          {cheapestPrice.original_price}
                        </span>
                      )}
                      <span
                        className={
                          cheapestPrice.price_type === "sale"
                            ? "text-sale font-medium"
                            : "text-[#111111]"
                        }
                      >
                        {cheapestPrice.calculated_price}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[12px] lg:text-[14px] sm:text-[12px] lg:text-[14px] text-neutral-500">
                      Pricing unavailable
                    </span>
                  )}
                </div>
              </LocalizedClientLink>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default FeaturedProductsShowcase
