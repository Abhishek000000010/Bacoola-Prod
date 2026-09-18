"use client"

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react"

export type CaptionPhase = "hidden" | "stuck" | "released"

// Pins a caption near the bottom of the viewport while its (taller than one
// viewport) banner column scrolls through, with a symmetric gap-sized buffer
// on both ends:
//  - "hidden" -> "stuck": the caption doesn't pop in the instant the
//    column's top edge appears: it waits until the column has scrolled up
//    by one gap's-worth past the resting line.
//  - "stuck" -> "released": it lets go with that same gap of buffer before
//    the column's own bottom edge would reach it, instead of clinging all
//    the way to the edge -- important when banners are butted together with
//    no gap, so the outgoing caption never overlaps the next one.
// Driven directly off scroll position with plain getBoundingClientRect math
// (rather than position:sticky) because sticky's native engage/release
// points don't correspond to what's wanted here: sticky-top only clamps
// once the container has scrolled almost all the way up (~viewport-height
// minus the offset, regardless of the column's own height), and
// sticky-bottom never engages at all while scrolling forward through a
// column anchored at its own top.
export function useStickyCaption(
  columnRef: RefObject<HTMLElement | null>,
  gap: number,
  captionHeightEstimate = 20
) {
  const [phase, setPhase] = useState<CaptionPhase>("hidden")
  const [stuckMetrics, setStuckMetrics] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    let ticking = false
    const check = () => {
      ticking = false
      const column = columnRef.current
      if (!column) return

      const rect = column.getBoundingClientRect()
      const stuckTop = window.innerHeight - gap - captionHeightEstimate

      if (rect.top > stuckTop - gap) {
        setPhase("hidden")
      } else if (rect.bottom - gap - captionHeightEstimate > stuckTop) {
        setPhase("stuck")
        setStuckMetrics({ top: stuckTop, left: rect.left, width: rect.width })
      } else {
        setPhase("released")
      }
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(check)
      }
    }

    check() // in case it's already past a threshold on mount
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [gap, captionHeightEstimate])

  return { phase, stuckMetrics }
}

// Tracks the "md" (768px) breakpoint so a caption's gap can match whatever
// bottom-margin value it originally used at each size (e.g. bottom-6 vs
// md:bottom-8).
export function useResponsiveGap(mobileGap: number, mdGap: number) {
  const [gap, setGap] = useState(mobileGap)
  useEffect(() => {
    const update = () => setGap(window.innerWidth >= 768 ? mdGap : mobileGap)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [mobileGap, mdGap])
  return gap
}

// The inline style for each phase: "hidden" is pre-positioned exactly where
// the caption will land once stuck, so the opacity fade-in has no
// accompanying position jump.
export function getStickyCaptionStyle(
  phase: CaptionPhase,
  stuckMetrics: { top: number; left: number; width: number } | null,
  gap: number
): CSSProperties {
  if (phase === "stuck" && stuckMetrics) {
    return { position: "fixed", top: stuckMetrics.top, left: stuckMetrics.left, width: stuckMetrics.width }
  }
  if (phase === "released") {
    return { position: "absolute", bottom: gap, left: 0, right: 0 }
  }
  return { position: "absolute", top: gap, left: 0, right: 0 }
}
