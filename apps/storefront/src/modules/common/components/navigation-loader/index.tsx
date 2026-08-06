"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

/**
 * Global navigation loader.
 *
 * On the deployed backend a route change can take a while to come back, and
 * Next's App Router keeps the *current* page on screen until the new one is
 * ready. That reads as a frozen, unresponsive screen -- the user can't tell
 * their click registered. This mounts a single app-wide overlay that appears as
 * soon as a click starts a page navigation and disappears once the new route
 * commits, giving instant "it's loading" feedback everywhere without touching
 * any existing UI.
 *
 * Keyed strictly on the URL *pathname*: query-only updates (e.g. the product
 * page rewriting `?v_id=` when you pick a colour/size via router.replace) must
 * NOT trigger it, so a short show-delay also swallows instant client-cached
 * navigations -- the overlay only actually appears when a load is genuinely slow.
 */
export default function NavigationLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  // Latest committed pathname, read inside event handlers without re-binding.
  const pathnameRef = useRef(pathname)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hide + clear any pending timers.
  const doneRef = useRef<() => void>(() => {})
  doneRef.current = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
    }
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current)
      safetyTimer.current = null
    }
    setVisible(false)
  }

  // Arm the overlay for a navigation to `target` (a pathname).
  const startRef = useRef<(target: string) => void>(() => {})
  startRef.current = (target: string) => {
    if (target === pathnameRef.current) return // same page -> nothing to load
    if (showTimer.current) return // already armed / showing
    // Small delay so instant (cached) navigations never flash the overlay.
    showTimer.current = setTimeout(() => setVisible(true), 120)
    // Safety net: never let the overlay get stuck if a nav silently fails.
    safetyTimer.current = setTimeout(() => doneRef.current(), 12000)
  }

  // Route committed (or query changed) -> the new page is on screen: hide.
  useEffect(() => {
    pathnameRef.current = pathname
    doneRef.current()
  }, [pathname])

  useEffect(() => {
    const samePath = (raw: string) => {
      try {
        const u = new URL(raw, window.location.href)
        return (
          u.origin === window.location.origin &&
          u.pathname === window.location.pathname
        )
      } catch {
        return true
      }
    }

    // 1. Anchor clicks (covers every <Link>/LocalizedClientLink on the site).
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return
      const anchor = (e.target as Element | null)?.closest?.("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return
      try {
        const url = new URL(anchor.href, window.location.href)
        if (url.origin !== window.location.origin) return
        if (url.pathname === window.location.pathname) return // query/hash only
        startRef.current(url.pathname)
      } catch {
        /* malformed href: ignore */
      }
    }
    document.addEventListener("click", onClick, { capture: true })

    // 2. Programmatic navigations (router.push/replace patch history under the
    //    hood). Ignore same-pathname replaces like the product page's v_id.
    const patch = (name: "pushState" | "replaceState") => {
      const original = window.history[name]
      const wrapped = function (this: History, ...args: any[]) {
        const url = args[2]
        if (url != null && !samePath(String(url))) {
          try {
            startRef.current(new URL(String(url), window.location.href).pathname)
          } catch {
            /* ignore */
          }
        }
        return original.apply(this, args as any)
      }
      window.history[name] = wrapped as typeof original
      return () => {
        window.history[name] = original
      }
    }
    const restorePush = patch("pushState")
    const restoreReplace = patch("replaceState")

    // 3. Back / forward.
    const onPopState = () => {
      if (window.location.pathname !== pathnameRef.current) {
        startRef.current(window.location.pathname)
      }
    }
    window.addEventListener("popstate", onPopState)

    return () => {
      document.removeEventListener("click", onClick, { capture: true })
      window.removeEventListener("popstate", onPopState)
      restorePush()
      restoreReplace()
    }
  }, [])

  return (
    <div
      aria-hidden={!visible}
      role="status"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 transition-opacity duration-200 ${
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <span className="sr-only">Loading…</span>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-neutral-800 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-neutral-800 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-neutral-800 animate-bounce" />
      </div>
    </div>
  )
}
