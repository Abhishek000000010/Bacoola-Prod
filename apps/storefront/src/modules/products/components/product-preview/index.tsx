"use client"

import { useEffect, useRef, useState } from "react"
import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

import WishlistButton from "@modules/common/components/wishlist-button"
import { VariantCard } from "@lib/util/variant-cards"

export default function ProductPreview({
  product,
  isFeatured,
  card,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  /**
   * Unused, and optional so callers can stop sending it. This is a client
   * component, so anything passed here is serialised into the page for every
   * tile on it -- a whole region object per card, for nothing.
   */
  region?: HttpTypes.StoreRegion
  /**
   * Renders this tile as a single colourway instead of the whole product.
   * Listing pages pass one card per colour; rails and related-product strips
   * omit it and keep the original one-tile-per-product behaviour.
   */
  card?: VariantCard
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: card?.variantId,
  })

  // A colourway shows its own price; without one the cheapest variant stands in.
  const displayPrice = variantPrice ?? cheapestPrice
  const href = card?.href ?? `/products/${product.handle}`
  const title = card?.title ?? product.title
  const thumbnail = card?.thumbnail ?? product.thumbnail

  const images = product.images || []
  const [currentImageIndex, setCurrentImageIndex] = useState(() => {
    if (!images.length) return 0
    const idx = images.findIndex((img: any) => img.url === thumbnail)
    return idx !== -1 ? idx : 0
  })

  // Every slide of this carousel is a Next <Image>, and each one costs ~1.3KB of
  // srcset markup. A listing renders one card per colourway and each card
  // carries the product's whole image list, so eagerly rendering every slide put
  // 1266 <img> tags into a single category page -- ~2s of server render for 12
  // products, almost all of it off-screen and never looked at.
  //
  // Mount only the visible slide until the card nears the viewport, then mount
  // the rest. Starting false means the SERVER also emits just one slide per
  // card, which is where the saving actually comes from; the first client render
  // matches that, so there is no hydration mismatch.
  const [slidesReady, setSlidesReady] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)
  const mountSlides = () => setSlidesReady(true)

  useEffect(() => {
    if (slidesReady) return

    const node = carouselRef.current
    // Without IntersectionObserver, fall back to the old eager behaviour rather
    // than leaving the carousel permanently stuck on one image.
    if (!node || typeof IntersectionObserver === "undefined") {
      setSlidesReady(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSlidesReady(true)
          observer.disconnect()
        }
      },
      // Mount a screenful early so slides are in place before a card is reached.
      { rootMargin: "600px 0px" }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [slidesReady])

  // Until the rest are mounted there is exactly one slide, so the track must not
  // be offset or the single image would be translated out of view.
  const visibleImages = slidesReady ? images : images.slice(currentImageIndex, currentImageIndex + 1)
  const trackOffset = slidesReady ? currentImageIndex * 100 : 0

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    mountSlides()
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    }
  }

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    mountSlides()
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    }
  }

  const displayThumbnail = images.length > 0 ? images[currentImageIndex].url : thumbnail

  if (isFeatured) {
    return (
      <LocalizedClientLink href={href} className="group block">
        <div data-testid="product-wrapper" className="flex flex-col">
          {/* Image Container with hover overlay */}
          <div className="relative overflow-hidden group/image w-full">
            <Thumbnail
              thumbnail={thumbnail}
              images={card ? undefined : product.images}
              size="full"
              isFeatured={isFeatured}
            />
            {/* Sizes Slide Up Bar */}
            <div className="absolute bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm translate-y-full opacity-0 group-hover/image:translate-y-0 group-hover/image:opacity-100 transition-all duration-300 py-3 flex justify-center items-center gap-4 text-xs lg:text-sm font-bold text-gray-800">
              {product.options?.find((o: any) => o.title?.toLowerCase() === 'size' || o.title?.toLowerCase() === 'sizes')?.values?.map((v: any) => (
                <span key={v.value} className="nav-underline cursor-pointer">{v.value}</span>
              )) || (
                 <span className="nav-underline cursor-pointer tracking-wider uppercase text-[12px] lg:text-[14px] text-gray-500">View Details</span>
              )}
            </div>
          </div>

          {/* Product Details (Below Image) */}
          <div className="mt-3 flex flex-col px-2">
            <div className="flex justify-between items-start gap-2">
               <div className="flex flex-col">
                  <Text className="text-[12px] lg:text-[14px] text-gray-500 uppercase tracking-wider mb-0.5">Selection</Text>
                  <Text className="text-xs lg:text-sm font-semibold text-gray-900 line-clamp-1" data-testid="product-title">
                    {title}
                  </Text>
               </div>
               <WishlistButton product={product} card={card} iconClassName="w-[18px] h-[18px]" />
            </div>

            <div className="mt-1 flex items-center gap-x-2 text-[12px] lg:text-[14px]">
              {displayPrice && <PreviewPrice price={displayPrice} />}
            </div>
          </div>
        </div>
      </LocalizedClientLink>
    )
  }

  return (
    <LocalizedClientLink href={href} className="group block w-full h-full">
      <div
        data-testid="product-wrapper"
        className="flex flex-col w-full h-full relative bg-white"
      >
        {/* Mango-style Image Container (Exact 2048x2867 Ratio) */}
        {/* Interaction mounts the slides too, not just the observer. A card
            inside a hidden container (the category landing layout keeps its grid
            `display: none`) never intersects, so the observer alone would leave
            the arrows stuck on a single image once it is revealed. */}
        <div
          ref={carouselRef}
          onMouseEnter={mountSlides}
          onTouchStart={mountSlides}
          onFocusCapture={mountSlides}
          className="relative w-full aspect-[2048/2867] overflow-hidden bg-[#F3F3F3]"
        >
          <div
            className="flex w-full h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${trackOffset}%)` }}
          >
            {visibleImages.length > 0 ? (
              visibleImages.map((img: any, i: number) => (
                <div key={img.url || i} className="w-full h-full flex-shrink-0">
                  <Thumbnail
                    thumbnail={img.url}
                    images={undefined}
                    size="full"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="w-full h-full flex-shrink-0">
                <Thumbnail
                  thumbnail={thumbnail}
                  images={undefined}
                  size="full"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          
          {/* Sizes Slide Up Bar (Mango Style) */}
          <div className="absolute bottom-0 left-0 w-full bg-white/90 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 py-2.5 flex justify-center items-center gap-4 text-[12px] lg:text-[14px] font-medium text-gray-900 tracking-widest uppercase">
            {product.options?.find((o: any) => o.title?.toLowerCase() === 'size' || o.title?.toLowerCase() === 'sizes')?.values?.map((v: any) => (
              <span key={v.value} className="nav-underline cursor-pointer px-1">{v.value}</span>
            )) || (
               <>
                 <span className="nav-underline cursor-pointer px-1">XS</span>
                 <span className="nav-underline cursor-pointer px-1">S</span>
                 <span className="nav-underline cursor-pointer px-1">M</span>
                 <span className="nav-underline cursor-pointer px-1">L</span>
                 <span className="nav-underline cursor-pointer px-1">XL</span>
               </>
            )}
          </div>
          
          {/* Arrows for hover */}
          <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
             <button onClick={handlePrev} className="pointer-events-auto p-1 text-gray-800 hover:text-black focus:outline-none">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
               </svg>
             </button>
             <button onClick={handleNext} className="pointer-events-auto p-1 text-gray-800 hover:text-black focus:outline-none">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
               </svg>
             </button>
          </div>

          {/* Quick-add "+" (mobile only, Mango style) */}
          <div
            aria-hidden="true"
            className="pp-plus small:hidden absolute bottom-2 right-2 z-10 flex h-[26px] w-[26px] items-center justify-center bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-[22px] h-[22px] text-black">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </div>

        {/* DESKTOP Details Section (Unchanged) */}
        <div className="pp-d-details hidden small:flex justify-between items-start pt-3 px-1">
           <div className="flex flex-col gap-y-0.5">
              <Text className="!text-[12px] lg:text-[14px] !leading-tight text-gray-900 line-clamp-1" data-testid="product-title">
                {title}
              </Text>
              <div className="flex items-center text-[12px] lg:text-[14px] text-gray-900 mt-0.5">
                {displayPrice && <PreviewPrice price={displayPrice} />}
              </div>
           </div>

           <WishlistButton product={product} card={card} iconClassName="w-4 h-4" />
        </div>

        {/* MOBILE Details Section (Mango Style) */}
        <div className="pp-m-details flex small:hidden flex-col pt-3 pb-4 px-2">
           <div className="flex justify-between items-center gap-x-2">
              <Text className="pp-m-title text-[12px] lg:text-[14px] text-black leading-snug line-clamp-1" data-testid="product-title">
                {title}
              </Text>
              <WishlistButton product={product} card={card} iconClassName="pp-m-heart w-4 h-4 flex-shrink-0 text-black" />
           </div>

           <div className="pp-m-price mt-1 text-[12px] lg:text-[14px] text-black">
              {displayPrice && <PreviewPrice price={displayPrice} isMobileLayout={true} />}
           </div>

           {/* Add Button (Mango Style) */}
           <button 
             className="pp-m-add-btn hidden w-full bg-[#111111] text-white text-[12px] lg:text-[14px] font-bold py-3 mt-1 items-center justify-center transition-colors hover:bg-black"
             onClick={(e) => e.preventDefault()}
           >
             ADD
           </button>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
