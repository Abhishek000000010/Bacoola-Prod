"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import Image from "next/image"
import { Heart } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { addToCart } from "@lib/data/cart"
import { isEqual } from "lodash"
import ProductPrice from "../components/product-price"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import WishlistButton from "@modules/common/components/wishlist-button"
import MeasurementsPanel from "../components/measurements-panel"
import { parseMeasurements } from "@lib/util/measurements"
import DetailsPanel from "../components/details-panel"
import { parseProductDetails } from "@lib/util/product-details"
import StoreAvailabilityPanel from "../components/store-availability-panel"
import NotifyRestockPanel from "../components/notify-restock-panel"
import { STORES } from "@lib/util/stores"
import { FadeIn } from "@modules/common/components/fade-in"
import LookPanel from "../components/look-panel"
import { lookForColour, ResolvedLook } from "@lib/util/look"
interface CustomProductDetailsProps {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  look?: ResolvedLook | null
}

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className="w-4 h-4 text-neutral-500 transition-transform duration-200"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
    />
  </svg>
)

const colorHexMap: Record<string, string> = {
  khaki: "#8F8165",
  black: "#111111",
  white: "#FFFFFF",
  "off-white": "#F5F5F0",
  brown: "#5C4033",
  rust: "#B85A38",
  blue: "#AED8E6",
  grey: "#888888",
  green: "#7E7F6B",
  yellow: "#FFDE43",
  red: "#D01313",
  pink: "#FFC0CB",
  beige: "#F5F5DC",
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

const getRowLayout = (n: number) => {
  if (n === 1) return [1]
  if (n === 2) return [2]
  if (n === 3) return [2, 1]
  if (n === 4) return [2, 2]
  if (n === 5) return [2, 3]
  if (n === 6) return [2, 4]
  if (n === 7) return [2, 2, 3]
  if (n === 8) return [2, 2, 4]
  if (n === 9) return [2, 3, 4]
  if (n === 10) return [2, 4, 4]
  if (n === 11) return [2, 2, 3, 4]
  if (n === 12) return [2, 2, 4, 4]
  
  const layout = [2]
  let remaining = n - 2
  while (remaining > 0) {
    if (remaining >= 4) {
      layout.push(4)
      remaining -= 4
    } else {
      layout.push(remaining)
      remaining = 0
    }
  }
  return layout
}

const getGridColsClass = (size: number) => {
  switch (size) {
    case 1: return "grid-cols-1"
    case 2: return "grid-cols-2"
    case 3: return "grid-cols-3"
    case 4: return "grid-cols-4"
    default: return "grid-cols-1"
  }
}

/**
 * Full-screen image viewer.
 *
 * Shows a single image at full width. A thumbnail rail on the left selects which
 * image is shown: hovering a thumbnail previews it temporarily, and the preview
 * reverts to the selected image on hover-out; clicking a thumbnail selects it
 * for good and resets the scroll to the top of that image. Scrolling pans within
 * the one displayed image only (it never advances to another image), and the
 * scrollbar is hidden. Esc or the close button dismisses it.
 */
const Lightbox = ({
  images,
  initialIndex,
  title,
  onClose,
}: {
  images: { url?: string }[]
  initialIndex: number
  title?: string
  onClose: () => void
}) => {
  // The clicked/committed image; hover only previews without changing it.
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [mobileSlide, setMobileSlide] = useState(initialIndex)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const mobileScrollRef = React.useRef<HTMLDivElement>(null)

  const displayedIndex = hoverIndex ?? selectedIndex
  const displayed = images[displayedIndex]

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => onClose(), 250) // Unmount right before animation finishes to be seamless
  }, [onClose])

  // Scroll to initial index on mobile
  useEffect(() => {
    if (mobileScrollRef.current) {
      // Need a small timeout to ensure the DOM is painted and width is calculated
      setTimeout(() => {
        if (mobileScrollRef.current) {
           const width = mobileScrollRef.current.offsetWidth
           mobileScrollRef.current.scrollTo({ left: width * initialIndex, behavior: "instant" as any })
        }
      }, 10)
    }
  }, [initialIndex])

  // Lock body scroll while open and close on Escape.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [handleClose])

  const select = (i: number) => {
    setSelectedIndex(i)
    setHoverIndex(null)
    // A newly selected image starts from its top.
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  return (
    <div className={`fixed inset-0 z-[100] bg-white ${isClosing ? "animate-[lightboxZoomOut_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]" : "animate-[lightboxZoom_0.3s_cubic-bezier(0.16,1,0.3,1)]"}`}>
      {/* Hide the scrollbar on the image column (all engines) without losing scroll. */}
      <style>{`.lb-scroll{scrollbar-width:none;-ms-overflow-style:none}.lb-scroll::-webkit-scrollbar{display:none} 
      @keyframes lightboxZoom { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      @keyframes lightboxZoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }
      `}</style>

      {/* Close */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close"
        className="fixed top-6 right-6 z-[120] flex h-7 w-7 items-center justify-center bg-white text-black transition-colors hover:bg-neutral-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Thumbnail rail */}
      <div
        className="fixed left-3 top-1/2 z-[110] hidden max-h-[92vh] -translate-y-1/2 flex-col gap-2 overflow-y-auto lb-scroll md:flex"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {images.map((img, i) => (
          <button
            key={img.url || i}
            type="button"
            onClick={() => select(i)}
            onMouseEnter={() => setHoverIndex(i)}
            aria-label={`View image ${i + 1}`}
            className={`relative w-14 shrink-0 overflow-hidden bg-neutral-100 transition-opacity duration-200 aspect-[3/4] ${
              i === selectedIndex ? "opacity-100" : "opacity-40 hover:opacity-100"
            }`}
          >
            {img.url && (
              <img src={img.url} alt="" className="h-full w-full object-cover object-center" />
            )}
          </button>
        ))}
      </div>

      {/* Single full-width image (desktop); scrolling stays within this image only. */}
      <div ref={scrollRef} className="hidden md:block h-full overflow-y-auto lb-scroll">
        {displayed?.url ? (
          <img
            src={displayed.url}
            alt={`${title ?? "Product image"} ${displayedIndex + 1}`}
            className="w-full object-contain"
          />
        ) : null}
      </div>

      {/* Mobile swipeable carousel */}
      <div 
        ref={mobileScrollRef}
        className="flex md:hidden h-full w-full overflow-x-auto snap-x snap-mandatory lb-scroll"
        onScroll={(e) => {
          const container = e.currentTarget
          const scrollLeft = container.scrollLeft
          const width = container.offsetWidth
          if (width > 0) {
            const newIndex = Math.round(scrollLeft / width)
            if (newIndex !== mobileSlide) setMobileSlide(newIndex)
          }
        }}
      >
        {images.map((img, i) => (
          <div key={img.url || i} className="w-full h-full flex-shrink-0 snap-center relative">
            {img.url && (
              <img
                src={img.url}
                alt={`${title ?? "Product image"} ${i + 1}`}
                className="w-full h-full object-cover object-center"
              />
            )}
          </div>
        ))}
      </div>

      {/* Dots Indicator for Mobile */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex md:hidden justify-center gap-1.5 pointer-events-none z-[120]">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1 transition-all duration-300 ${
                i === mobileSlide ? "bg-black w-4" : "bg-neutral-400 w-1.5"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CustomProductDetails({
  product,
  region,
  countryCode,
  images,
  look,
}: CustomProductDetailsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // With no colour chosen the gallery falls back to the WHOLE product gallery,
  // which on a multi-colourway product means every colour's photos at once.
  // Default to the colourway the thumbnail belongs to -- the one whose card the
  // shopper clicked -- so a bare product URL opens on a coherent set. Only the
  // colour is set; size stays unchosen, so no variant is implicitly selected.
  const defaultColourOptions = useCallback((): Record<string, string> => {
    const colourOption = (product.options ?? []).find((o) =>
      /^colou?rs?$/i.test((o.title ?? "").trim())
    )
    if (!colourOption || !product.variants?.length) return {}

    const owner =
      product.variants.find(
        (v) => (v.metadata as any)?.thumbnail === product.thumbnail
      ) ?? product.variants[0]

    const value = (owner.options ?? []).find(
      (o: any) => o.option_id === colourOption.id
    )?.value
    return value ? { [colourOption.id]: value } : {}
  }, [product.options, product.variants, product.thumbnail])

  // Resolve the pre-selected variant synchronously on first render (from the
  // v_id param, or a single-variant product). Doing this here instead of in a
  // post-mount effect avoids a flash where the gallery shows every image for one
  // render before the curated per-colour set is applied.
  const [options, setOptions] = useState<Record<string, string | undefined>>(() => {
    const vId = searchParams.get("v_id")
    if (vId && product.variants) {
      const variant = product.variants.find((v) => v.id === vId)
      if (variant) return optionsAsKeymap(variant.options) ?? {}
    }
    if (product.variants?.length === 1) {
      return optionsAsKeymap(product.variants[0].options) ?? {}
    }
    return defaultColourOptions()
  })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [measurementsOpen, setMeasurementsOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [storesOpen, setStoresOpen] = useState(false)
  const [lookOpen, setLookOpen] = useState(false)
  // Mobile-only: the size picker is deferred to a bottom sheet that opens on ADD,
  // so the product page itself stays clean (desktop keeps the inline size list).
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false)
  // The out-of-stock variant a shopper tapped to be notified about (opens the
  // "notify me when back in stock" panel). Null when the panel is closed.
  const [notifyVariant, setNotifyVariant] =
    useState<HttpTypes.StoreProductVariant | null>(null)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    description: true,
    composition: false,
    shipping: false,
  })

  // Preselect options if v_id query parameter is present or if only 1 variant exists
  useEffect(() => {
    const vId = searchParams.get("v_id")
    if (vId && product.variants) {
      const variant = product.variants.find((v) => v.id === vId)
      if (variant) {
        const variantOptions = optionsAsKeymap(variant.options)
        setOptions(variantOptions ?? {})
      }
    } else if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    } else {
      // Landed without a v_id (a shared link, or the URL cleared after an
      // invalid combination): keep a colour selected so the gallery stays on
      // one colourway instead of reverting to every image on the product.
      setOptions((prev) =>
        Object.keys(prev).length ? prev : defaultColourOptions()
      )
    }
  }, [product.variants, searchParams, defaultColourOptions])

  // Compute selected variant based on option choices
  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // Check variant validation
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // Update URL search parameters when the selected variant changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString(), { scroll: false })
  }, [selectedVariant, isValidVariant, pathname, router, searchParams])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  // Check inventory stock status
  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }
    if (selectedVariant?.allow_backorder) {
      return true
    }
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }
    return false
  }, [selectedVariant])

  // Handle Add to Bag action with accurate loading state
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return

    setIsAdding(true)

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      })
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setIsAdding(false)
    }
  }

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Exact swatch colours, when the catalogue carries them.
  //
  // colorHexMap below only knows a handful of names, and a name like "stone" or
  // "camel" is a whole family of shades. Imported products record the colour
  // sampled from the supplier's own swatch on each variant, so prefer that and
  // keep the name map as the fallback for hand-entered products.
  const colorHexByValue = useMemo(() => {
    const map: Record<string, string> = {}
    const colourOption = (product.options ?? []).find((o) =>
      /^colou?rs?$/i.test((o.title ?? "").trim())
    )
    if (!colourOption) return map

    for (const v of product.variants ?? []) {
      const value = (v.options ?? []).find(
        (o: any) => o.option_id === colourOption.id
      )?.value
      const hex = (v.metadata as any)?.color_hex
      if (value && typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex)) {
        map[value.toLowerCase()] = hex
      }
    }
    return map
  }, [product])

  // Prioritize selected variant's curated images, fallback to product images.
  const productImages = useMemo(() => {
    let finalImages: HttpTypes.StoreProductImage[] = []

    // The admin curates a variant's gallery per colourway as `metadata.image_order`
    // -- an ordered list of product image ids. Medusa has no real variant->image
    // relation (a variant's `images` resolves to the whole product gallery), so
    // this list is the single source of truth for BOTH which images show and
    // their order. Only listed images appear, in listed order; ids that no longer
    // exist on the product are skipped. An empty/absent list means "not curated",
    // and we fall back to the full product gallery below.
    const byId = new Map<string, HttpTypes.StoreProductImage>(
      (product.images ?? []).map((i) => [i.id, i])
    )

    // Resolve the curated list. Prefer the fully-selected variant, but curation
    // is per-COLOURWAY (all same-colour variants share one list), so fall back to
    // any variant of the currently-selected colour. That makes the gallery swap
    // as soon as a colour is picked, before a size is chosen.
    let savedOrder = (selectedVariant?.metadata as any)?.image_order
    if (!(Array.isArray(savedOrder) && savedOrder.length > 0)) {
      const colourOption = (product.options ?? []).find((o) =>
        /^colou?rs?$/i.test((o.title ?? "").trim())
      )
      const selectedColour = colourOption ? options[colourOption.id] : undefined
      if (colourOption && selectedColour) {
        const match = product.variants?.find((v) => {
          const value = (v.options ?? []).find(
            (o: any) => o.option_id === colourOption.id
          )?.value
          const list = (v.metadata as any)?.image_order
          return value === selectedColour && Array.isArray(list) && list.length > 0
        })
        savedOrder = (match?.metadata as any)?.image_order
      }
    }

    if (Array.isArray(savedOrder) && savedOrder.length > 0) {
      finalImages = savedOrder
        .map((id: string) => byId.get(id))
        .filter((img): img is HttpTypes.StoreProductImage => Boolean(img))
    }

    if (finalImages.length === 0 && images && images.length > 0) {
      finalImages = images
    }

    if (finalImages.length === 0 && product.images && product.images.length > 0) {
      finalImages = product.images
    }

    // Filter out the thumbnail from the gallery if we have other images to show,
    // to prevent the thumbnail from duplicating across all variants.
    if (finalImages.length > 1 && product.thumbnail) {
      const withoutThumbnail = finalImages.filter(img => img.url !== product.thumbnail)
      if (withoutThumbnail.length > 0) {
        return withoutThumbnail
      }
    }

    if (finalImages.length > 0) {
      return finalImages
    }

    return product.thumbnail ? [{ url: product.thumbnail }] : []
  }, [selectedVariant, options, product.options, product.variants, images, product.images, product.thumbnail])

  const memoizedImageGallery = useMemo(() => {
    const layout = getRowLayout(productImages.length)
    let imgIndex = 0

    return (
      <FadeIn delay={100} className="lg:col-span-7 flex flex-col w-full relative">
        {/* Mobile Carousel (hidden on desktop) */}
        <div className="flex lg:hidden flex-col w-full relative">
          <div 
            className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
            onScroll={(e) => {
              const container = e.currentTarget
              const scrollLeft = container.scrollLeft
              const width = container.offsetWidth
              const newIndex = Math.round(scrollLeft / width)
              if (newIndex !== activeSlide) {
                setActiveSlide(newIndex)
              }
            }}
          >
            {productImages.map((img, index) => (
              <div
                key={`mobile-${img.url || index}`}
                className="w-full flex-shrink-0 snap-center relative aspect-[3/4] bg-neutral-50"
                onClick={() => img.url && setLightboxIndex(index)}
              >
                {img.url ? (
                  <Image
                    src={img.url}
                    alt={`${product.title ?? "Product Image"} ${index + 1}`}
                    fill
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    sizes="100vw"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs lg:text-sm">
                    NO IMAGE
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Dots Indicator */}
          {productImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
              {productImages.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 transition-all duration-300 ${
                    i === activeSlide ? "bg-black w-4" : "bg-neutral-300 w-1.5"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop Grid (hidden on mobile) */}
        <div className="hidden lg:flex flex-col gap-[2px] h-fit w-full">
          {layout.map((rowSize, rowIndex) => {
            const rowImages = productImages.slice(imgIndex, imgIndex + rowSize)
            const currentRowIndex = imgIndex
            imgIndex += rowSize

            return (
              <div key={rowIndex} className={`grid ${getGridColsClass(rowSize)} gap-[2px] w-full`}>
                {rowImages.map((img, index) => (
                  <div
                    key={img.url || index}
                    className={`relative w-full overflow-hidden bg-neutral-50 cursor-zoom-in ${rowIndex === 0 ? "aspect-[3/4] lg:aspect-auto lg:h-[751px]" : "aspect-[3/4]"}`}
                    onClick={() => img.url && setLightboxIndex(currentRowIndex + index)}
                  >
                    {img.url ? (
                      <Image
                        src={img.url}
                        alt={`${product.title ?? "Product Image"} angle ${currentRowIndex + index + 1}`}
                        fill
                        priority={rowIndex === 0}
                        loading={rowIndex === 0 ? undefined : "lazy"}
                        sizes="(max-width: 1024px) 100vw, 55vw"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs lg:text-sm">
                        NO IMAGE
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </FadeIn>
    )
  }, [productImages, product.title, activeSlide])

  // Measurements are entered per product in admin and stored on metadata; the
  // panel opens on whichever size the shopper has already picked, if any.
  const measurements = useMemo(
    () => parseMeasurements(product.metadata as Record<string, unknown> | null),
    [product.metadata]
  )
  const details = useMemo(
    () => parseProductDetails(product.metadata as Record<string, unknown> | null),
    [product.metadata]
  )
  const sizeOption = useMemo(
    () =>
      (product.options ?? []).find((o) =>
        /^sizes?$/i.test((o.title ?? "").trim())
      ),
    [product.options]
  )
  const sizeValues = useMemo(
    () =>
      sizeOption
        ? (Array.from(
            new Set(sizeOption.values?.map((v) => v.value).filter(Boolean))
          ) as string[])
        : [],
    [sizeOption]
  )
  const selectedSize = sizeOption ? options[sizeOption.id] : undefined

  // The variant a given size maps to, holding the currently selected colour
  // (and any other options) fixed.
  const variantForSize = useCallback(
    (sizeValue: string) => {
      if (!sizeOption) return undefined
      const target = { ...options, [sizeOption.id]: sizeValue }
      return product.variants?.find((v) =>
        isEqual(optionsAsKeymap(v.options), target)
      )
    },
    [sizeOption, options, product.variants]
  )

  const isVariantInStock = useCallback(
    (v?: HttpTypes.StoreProductVariant) => {
      if (!v) return false
      if (!v.manage_inventory) return true
      if (v.allow_backorder) return true
      return (v.inventory_quantity || 0) > 0
    },
    []
  )

  // "See look" follows the colour on screen, like the gallery: that colour's own
  // look if the admin set one, else the product's default. No items, no button.
  const lookItems = useMemo(() => {
    const colourOption = (product.options ?? []).find((o) =>
      /^colou?rs?$/i.test((o.title ?? "").trim())
    )
    return lookForColour(look, colourOption ? options[colourOption.id] : undefined)
  }, [look, product.options, options])

  // Mobile ADD: pick a size in the sheet, then add that variant straight to the
  // bag. State updates are async, so we resolve the variant from the chosen size
  // directly instead of waiting on the selectedVariant memo.
  const handleSelectSizeAndAdd = async (sizeValue: string) => {
    if (!sizeOption) return
    const variant = variantForSize(sizeValue)
    setOptions((prev) => ({ ...prev, [sizeOption.id]: sizeValue }))
    setSizeSheetOpen(false)
    if (!variant?.id || !isVariantInStock(variant)) return

    setIsAdding(true)
    try {
      await addToCart({ variantId: variant.id, quantity: 1, countryCode })
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setIsAdding(false)
    }
  }

  // What the mobile ADD button does: always open the size sheet first (the item
  // is only added once a size is tapped in the sheet). Products with no size
  // option fall back to adding the resolved variant directly.
  const handleMobileAdd = () => {
    if (sizeOption && sizeValues.length > 0) {
      setSizeSheetOpen(true)
      return
    }
    handleAddToCart()
  }

  return (
    <div className="relative w-full min-h-screen bg-white text-black font-sans pb-10 lg:pb-24">
      <div className="w-full px-0 lg:pr-12 pt-0 pb-6 lg:pt-0 lg:pb-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Left Section: Vertically Stacked Product Images */}
        {memoizedImageGallery}

        {/* Right Section: Sticky Info and Purchase Actions */}
        <FadeIn delay={200} className="lg:col-span-5 px-5 lg:px-0">
          <div 
            className="lg:sticky lg:top-[110px] lg:pt-0 lg:pb-[56px] flex flex-col items-start select-none w-full mx-auto"
            style={{ maxWidth: '480px' }}
          >
            

            {/* Product Title */}
            <h1 className="text-[16px] font-bold uppercase text-neutral-900 mb-2">
              {product.title}
            </h1>

            {/* Product Price */}
            <div className="mb-6 lg:mb-10 text-neutral-800 [&_span]:!text-[12px] lg:text-[14px] [&_span]:!font-normal [&_span]:!leading-none">
              <ProductPrice product={product} variant={selectedVariant} />
            </div>

            {/* Dynamic Option Selectors */}
            {[...(product.options || [])].sort((a, b) => {
              const aTitle = a.title?.toLowerCase() || ""
              const bTitle = b.title?.toLowerCase() || ""
              if (aTitle.includes("color")) return -1
              if (bTitle.includes("color")) return 1
              return 0
            }).map((option) => {
              const optionTitle = option.title?.toLowerCase() || ""
              const values = Array.from(new Set(option.values?.map((v) => v.value).filter(Boolean))) as string[]
              const currentValue = options[option.id]

              if (optionTitle === "color") {
                return (
                  <div key={option.id} className="order-first lg:order-none flex flex-col w-full pb-3 mb-4 lg:mb-0">
                    <div className="flex justify-between items-end">
                      <div className="flex gap-x-3">
                        {values.map((val) => {
                          const hex =
                            colorHexByValue[val.toLowerCase()] ||
                            colorHexMap[val.toLowerCase()] ||
                            val.toLowerCase()
                          const isSelected = currentValue === val
                          return (
                            <button
                              key={val}
                              onClick={() => setOptionValue(option.id, val)}
                              className={`relative w-4 h-4 focus:outline-none transition-all duration-200 ${
                                isSelected ? "" : "opacity-80"
                              }`}
                              style={{ backgroundColor: hex }}
                              title={val}
                            >
                              {isSelected && (
                                <span className="absolute -bottom-[4px] left-0 w-full h-[1.5px] bg-black" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <span className="text-[12px] lg:text-[14px] font-normal text-neutral-800 capitalize">
                        {currentValue || ""}
                      </span>
                    </div>
                  </div>
                )
              }

              if (optionTitle === "size") {
                return (
                  <div key={option.id} className="hidden lg:flex flex-col w-full mb-6">
                    {/* Box grid, as on the Mango reference: six across, spanning the same width as the ADD row.
                        Each cell pulls back 1px (-mt-px/-ml-px) so neighbouring
                        borders overlap into a single hairline; the selected cell
                        is raised (z-10) so its dark outline shows on all sides. */}
                    <div className="grid grid-cols-6 w-full pt-px pl-px text-[12px] lg:text-[14px] font-bold text-neutral-900">
                      {values.map((val) => {
                        const isSelected = currentValue === val
                        const variant = variantForSize(val)
                        const outOfStock = !isVariantInStock(variant)
                        // Out-of-stock size: don't select it (there's nothing to
                        // add) -- clicking opens the back-in-stock notify panel,
                        // like the bell affordance on the Mango reference.
                        return (
                          <button
                            key={val}
                            onClick={() =>
                              outOfStock
                                ? variant?.id && setNotifyVariant(variant)
                                : setOptionValue(option.id, val)
                            }
                            title={outOfStock ? "Notify me when back in stock" : undefined}
                            aria-pressed={isSelected}
                            className={`relative -mt-px -ml-px flex h-[60px] flex-col items-start justify-start gap-y-2 border bg-white px-3 py-3 text-left focus:outline-none focus-visible:z-10 focus-visible:border-neutral-800 transition-colors ${
                              isSelected
                                ? "z-10 border-neutral-800 text-black"
                                : outOfStock
                                ? "border-neutral-300 text-neutral-400 hover:z-10 hover:border-neutral-500"
                                : "border-neutral-300 text-neutral-900 hover:z-10 hover:border-neutral-500"
                            }`}
                          >
                            <span className={`uppercase leading-none ${outOfStock ? "line-through decoration-neutral-400" : ""}`}>
                              {val}
                            </span>
                            {outOfStock && (
                              <svg
                                aria-hidden="true"
                                className="w-3.5 h-3.5 text-neutral-900 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              // Fallback default selector for other option types
              return (
                <div key={option.id} className="flex flex-col mb-6 w-full border-b border-neutral-200 pb-4">
                  <span className="text-[12px] lg:text-[14px] font-bold text-neutral-900 mb-3 uppercase">
                    {option.title}: {currentValue || `SELECT ${option.title}`}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {values.map((val) => {
                      const isSelected = currentValue === val
                      return (
                        <button
                          key={val}
                          onClick={() => setOptionValue(option.id, val)}
                          className={`px-4 py-2 border text-[12px] lg:text-[14px] font-bold rounded-none transition-all focus:outline-none ${
                            isSelected
                              ? "border-black bg-black text-white"
                              : "border-neutral-200 hover:border-neutral-400 text-neutral-800"
                          }`}
                        >
                          {val}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Measurements -- only when the admin has entered them */}
            {measurements && (
              <button
                type="button"
                onClick={() => setMeasurementsOpen(true)}
                className="mb-6 w-full pb-4 text-left text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] text-neutral-900 transition-colors hover:text-neutral-500 focus:outline-none"
              >
                Measurements
              </button>
            )}

            {/* Add to Bag and Wishlist Action Buttons (desktop: needs a resolved
                variant up front, since the size list is shown inline). When a
                resolved variant is sold out, the primary button captures an
                email instead of being a dead "out of stock". */}
            <div className="hidden lg:flex gap-x-[2px] w-full mb-[2px]">
              {selectedVariant && isValidVariant && !inStock ? (
                <button
                  onClick={() => setNotifyVariant(selectedVariant)}
                  className="flex-1 py-3 bg-[#181818] text-white text-[12px] lg:text-[14px] font-bold hover:bg-black transition-colors focus:outline-none"
                >
                  NOTIFY ME WHEN AVAILABLE
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={
                    (product.variants?.length ?? 0) > 0 &&
                    (!isValidVariant || !selectedVariant || !inStock || isAdding)
                  }
                  className="flex-1 py-3 bg-[#181818] text-white text-[12px] lg:text-[14px] font-bold hover:bg-black transition-colors focus:outline-none disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
                >
                  {isAdding
                    ? "ADDING..."
                    : !selectedVariant && (product.variants?.length ?? 0) > 1
                    ? "SELECT OPTIONS"
                    : !inStock
                    ? "OUT OF STOCK"
                    : "ADD"}
                </button>
              )}
              <WishlistButton
                product={product}
                iconClassName="w-[18px] h-[18px] text-white"
                className="px-[18px] bg-[#181818] hover:bg-black transition-colors shrink-0 flex items-center justify-center"
              />
            </div>

            {/* Mobile: ADD opens the size sheet first (no inline size list), then
                the chosen variant is added straight from the sheet. */}
            <div className="flex lg:hidden gap-x-[2px] w-full mb-[2px]">
              <button
                onClick={handleMobileAdd}
                disabled={isAdding}
                className="flex-1 py-3 bg-[#181818] text-white text-[12px] lg:text-[14px] font-bold hover:bg-black transition-colors focus:outline-none disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
              >
                {isAdding ? "ADDING..." : "ADD"}
              </button>
              <WishlistButton
                product={product}
                iconClassName="w-[18px] h-[18px] text-white"
                className="px-[18px] bg-[#181818] hover:bg-black transition-colors shrink-0 flex items-center justify-center"
              />
            </div>

            {/* See look -- only when the admin linked in-stock products to the
                colour on screen (or to the product as a whole). */}
            {lookItems.length > 0 && (
              <button
                type="button"
                onClick={() => setLookOpen(true)}
                className="mt-2 w-full py-3 border border-[#181818] bg-white text-[#181818] text-[12px] lg:text-[14px] font-bold uppercase hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-black"
              >
                See look
              </button>
            )}

            {/* Tags and Description */}
            <div className="flex gap-x-5 mt-6 mb-4 text-[12px] lg:text-[14px] font-bold text-neutral-800 uppercase tracking-[0.05em] flex-wrap">
              <span>REGULAR FIT</span>
              <span>SHIRT COLLAR</span>
              <span>STANDARD LENGTH</span>
            </div>
            <p className="text-[12px] lg:text-[14px] text-neutral-800 leading-relaxed w-full">
              {product.description || "Regular fit. Cotton and linen blend fabric. Shirt collar. Short sleeves."}
            </p>

            {/* Details, composition and care -- only when the admin has entered them */}
            {details && (
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="mt-10 w-full text-left text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] text-neutral-900 transition-colors hover:text-neutral-500 focus:outline-none"
              >
                Details, composition and care
              </button>
            )}

            {/* Store availability -- hidden entirely when there are no stores */}
            {STORES.length > 0 && (
              <button
                type="button"
                onClick={() => setStoresOpen(true)}
                className="mt-6 w-full text-left text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] text-neutral-900 transition-colors hover:text-neutral-500 focus:outline-none"
              >
                Store availability
              </button>
            )}

          </div>
        </FadeIn>

      </div>

      {/* Mobile-only size picker. Slides up from the bottom on ADD; choosing a
          size adds that variant to the bag and dismisses the sheet. */}
      {sizeSheetOpen &&
        (() => {
          // Resolve each size to its variant + stock state once, so the grid and
          // the "last few items" legend agree.
          const LOW_STOCK = 5
          const cells = sizeValues.map((val) => {
            const variant = variantForSize(val)
            const inStk = isVariantInStock(variant)
            const qty = variant?.inventory_quantity ?? 0
            const lowStock =
              inStk &&
              Boolean(variant?.manage_inventory) &&
              !variant?.allow_backorder &&
              qty > 0 &&
              qty <= LOW_STOCK
            return { val, outOfStock: !inStk, lowStock }
          })
          const anyLowStock = cells.some((c) => c.lowStock)

          return (
            <div className="fixed inset-0 z-[100] lg:hidden">
              <div
                className="absolute inset-0 bg-black/25"
                onClick={() => setSizeSheetOpen(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Choose your size"
                className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] animate-[sizeSheetUp_0.32s_cubic-bezier(0.32,0.72,0,1)]"
              >
                <style>{`@keyframes sizeSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

                {/* Header: title + measurements link (only when measurements
                    exist) + close. */}
                <header className="flex shrink-0 items-center gap-x-4 px-5 pt-6 pb-4">
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.02em] text-neutral-900">
                    Choose your size
                  </h2>
                  <div className="ml-auto flex items-center gap-x-4">
                    {measurements && (
                      <button
                        type="button"
                        onClick={() => {
                          setSizeSheetOpen(false)
                          setMeasurementsOpen(true)
                        }}
                        className="text-[13px] font-bold uppercase tracking-[0.02em] text-neutral-900 transition-colors hover:text-neutral-500 focus:outline-none"
                      >
                        Measurements
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSizeSheetOpen(false)}
                      aria-label="Close"
                      className="flex h-6 w-6 items-center justify-center text-neutral-900 transition-colors hover:text-neutral-500"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeWidth="1.5" d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
                  {/* Size grid -- only real sizes get a cell (top/left rule on the
                      container, right/bottom per cell) so there are no empty
                      trailing boxes on the last row. */}
                  <div className="grid grid-cols-4 border-t border-l border-neutral-200">
                    {cells.map(({ val, outOfStock, lowStock }) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          if (outOfStock) {
                            // Sold out: capture an email instead of adding.
                            const variant = variantForSize(val)
                            setSizeSheetOpen(false)
                            if (variant?.id) setNotifyVariant(variant)
                            return
                          }
                          handleSelectSizeAndAdd(val)
                        }}
                        className={`relative flex h-[68px] flex-col items-start justify-start border-r border-b border-neutral-200 bg-white px-3 py-3 text-[13px] font-bold uppercase transition-colors focus:outline-none ${
                          outOfStock
                            ? "text-neutral-300 line-through decoration-neutral-300 active:bg-neutral-50"
                            : "text-neutral-900 active:bg-neutral-100"
                        }`}
                      >
                        <span>{val}</span>
                        {outOfStock && (
                          <svg
                            aria-hidden="true"
                            className="absolute bottom-2.5 right-2.5 h-3.5 w-3.5 text-neutral-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                          </svg>
                        )}
                        {lowStock && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-3 left-3 h-1.5 w-1.5 bg-[#C2410C]"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {anyLowStock && (
                    <div className="mt-4 flex items-center gap-x-2">
                      <span aria-hidden="true" className="h-1.5 w-1.5 bg-[#C2410C]" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.02em] text-[#C2410C]">
                        Last few items!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

      {notifyVariant && (
        <NotifyRestockPanel
          variantId={notifyVariant.id}
          productTitle={product.title}
          variantTitle={notifyVariant.title ?? undefined}
          onClose={() => setNotifyVariant(null)}
        />
      )}

      {lookOpen && lookItems.length > 0 && (
        <LookPanel items={lookItems} onClose={() => setLookOpen(false)} />
      )}

      {storesOpen && <StoreAvailabilityPanel onClose={() => setStoresOpen(false)} />}

      {detailsOpen && details && (
        <DetailsPanel details={details} onClose={() => setDetailsOpen(false)} />
      )}

      {measurementsOpen && measurements && (
        <MeasurementsPanel
          measurements={measurements}
          initialSize={selectedSize}
          onClose={() => setMeasurementsOpen(false)}
        />
      )}

      {lightboxIndex !== null && productImages.length > 0 && (
        <Lightbox
          images={productImages}
          initialIndex={lightboxIndex}
          title={product.title}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
