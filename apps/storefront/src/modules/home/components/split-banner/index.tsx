"use client"

import React, { useRef } from "react"
import CloudinaryImage from "@modules/common/components/cloudinary-image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useResponsiveGap, useStickyCaption, getStickyCaptionStyle } from "@modules/common/hooks/use-sticky-caption"

export interface SplitBannerProps {
  items?: any[]
  fallbackItems?: any[]
}

const defaultFallback = [
  { title: "Shirts", desktop_image: "/images/campaign-1.jpg", button_link: "/store", button_text: "SEE ALL" },
  { title: "Trousers", desktop_image: "/images/campaign-2.jpg", button_link: "/store", button_text: "SEE ALL" },
]

const CAPTION_GAP_MOBILE = 24 // matches the original bottom-6
const CAPTION_GAP_MD = 40 // matches the original md:bottom-10

interface SplitBannerColumnProps {
  title: string
  image: string
  link: string
  buttonText: string
}

const SplitBannerColumn: React.FC<SplitBannerColumnProps> = ({ title, image, link, buttonText }) => {
  const columnRef = useRef<HTMLDivElement>(null)
  const gap = useResponsiveGap(CAPTION_GAP_MOBILE, CAPTION_GAP_MD)
  const { phase, stuckMetrics } = useStickyCaption(columnRef, gap)
  const captionStyle = getStickyCaptionStyle(phase, stuckMetrics, gap)

  return (
    // No fixed/overflow-hidden height here -- taller than one viewport
    // (h-[160vh]) so the caption can stick while scrolling past; the grid's
    // own row height simply follows that.
    <div ref={columnRef} className="relative h-[160vh] w-full group">
      {/* Image sits in its own overflow-hidden wrapper so the hover-zoom
          still clips -- overflow-hidden on this column itself (an ancestor
          of the caption below) would clip the "stuck" phase's fixed
          positioning too. */}
      <div className="absolute inset-0 w-full h-full overflow-hidden flex [&>picture]:w-full [&>picture]:h-full">
        <CloudinaryImage
          src={image}
          alt={title}
          className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.02] w-full h-full"
        />
      </div>

      <div
        style={captionStyle}
        className={`z-20 select-none px-6 md:px-10 text-white flex justify-between items-center transition-opacity duration-700 ease-out ${
          phase === "hidden" ? "opacity-0" : "opacity-100"
        }`}
      >
        <h2 className="text-sm md:text-base font-bold uppercase tracking-widest leading-none">
          {title}
        </h2>
        <LocalizedClientLink
          href={link}
          className="text-white text-sm md:text-base font-bold uppercase tracking-widest hover:text-neutral-300 transition-colors duration-300 leading-none"
        >
          {buttonText}
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export const SplitBanner: React.FC<SplitBannerProps> = ({ items, fallbackItems = defaultFallback }) => {
  const leftItem = items?.[0] || fallbackItems[0]
  const rightItem = items?.[1] || fallbackItems[1]

  const leftTitle = leftItem.title || fallbackItems[0].title
  const leftImage = leftItem.desktop_image || leftItem.mobile_image || fallbackItems[0].desktop_image
  const leftLink = leftItem.button_link || fallbackItems[0].button_link
  const leftButtonText = leftItem.button_text || fallbackItems[0].button_text

  const rightTitle = rightItem.title || fallbackItems[1].title
  const rightImage = rightItem.desktop_image || rightItem.mobile_image || fallbackItems[1].desktop_image
  const rightLink = rightItem.button_link || fallbackItems[1].button_link
  const rightButtonText = rightItem.button_text || fallbackItems[1].button_text

  return (
    <section className="w-full grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-2 bg-white relative">
      <SplitBannerColumn title={leftTitle} image={leftImage} link={leftLink} buttonText={leftButtonText} />
      <SplitBannerColumn title={rightTitle} image={rightImage} link={rightLink} buttonText={rightButtonText} />
    </section>
  )
}

export default SplitBanner
