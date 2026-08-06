// @ts-nocheck
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

/**
 * Mobile-only admin styling — injection mechanism.
 *
 * The Medusa admin dashboard is a prebuilt package (@medusajs/dashboard); we
 * can't edit its layout components. This widget is the supported escape hatch:
 * it renders nothing visible and instead injects a single <style> element into
 * <head>. Because the admin is a client-side SPA, that stylesheet is injected
 * once and then persists across every route change for the whole session.
 *
 * ── HARD RULE: never change the desktop admin UI ──────────────────────────
 * EVERY rule in MOBILE_CSS MUST live inside the `@media (max-width: 1023px)`
 * block below. 1023px is one pixel under Medusa's own `lg` breakpoint (the
 * dashboard switches to its mobile layout — hamburger + drawer — below `lg`),
 * so anything scoped here applies ONLY on phone/tablet widths and the desktop
 * UI is untouched by construction. Do not add rules outside that media query.
 *
 * The widget is registered on several high-traffic zones (see config) so it
 * mounts early no matter which page the admin lands on first; the id-guard keeps
 * it idempotent if more than one zone mounts.
 */

const STYLE_ELEMENT_ID = "bacoola-admin-mobile-styles"

// ---------------------------------------------------------------------------
// All mobile overrides go INSIDE this media query. Leave desktop alone.
// Currently a no-op scaffold — the wiring is live; drop targeted fixes into the
// labelled sections as we confirm each inconsistency against a screenshot.
// ---------------------------------------------------------------------------
const MOBILE_CSS = `
@media (max-width: 1023px) {
  /* === Global (safe nets) ==================================================
     e.g. prevent horizontal overflow that can push the topbar/hamburger
     off-screen. Add rules here. */

  /* === Nav drawer (the slide-in menu) ======================================
     Left intentionally untouched — the drawer already lays out consistently. */

  /* === List-page tables (Orders / Products / Customers / Promotions /
         Price Lists / Categories) ==========================================
     Scoped to \`main table\` so the Radix nav drawer (portalled outside <main>)
     is never affected. Medusa's data tables already scroll horizontally inside
     a bounded container; on phones two things read as broken:
       1. long hyphenated titles (e.g. Price Lists "teen-girl-sale-70:auto")
          break one word per line, making rows 4-5x too tall;
       2. the right padding (pr-6) wastes width so the last column clips sooner.
     Force single-line cells (matches the other tables) and tighten the trailing
     padding. The table still scrolls, so nothing becomes unreachable. Inner
     stacked title/subtitle blocks keep their own layout — nowrap only stops
     inline text from wrapping, it doesn't collapse block children. */
  main table th,
  main table td {
    white-space: nowrap;
    padding-right: 0.75rem;
  }

  /* === List-page toolbar (search bar overflowing) ==========================
     The toolbar row is \`justify-between\` with the search wrapped in a
     \`shrink-0\` group around an input that can't shrink, so on phones the Search
     field spills off the right edge. Let the row wrap (search drops to its own
     full-width line) and let the input fill it. Scoped via
     :has(input[type="search"]) to the list toolbar only — the global Cmd+K
     search and the filter popovers are portalled OUTSIDE <main>, so they're
     untouched. \`flex-wrap\` is a harmless no-op on the non-flex wrapper divs
     this selector also matches; the search icon is position:absolute so
     widening its container doesn't disturb it. */
  main div:has(> input[type="search"]),
  main div:has(> div > input[type="search"]),
  main div:has(> div > div > input[type="search"]) {
    flex-wrap: wrap;
    width: 100%;
  }
  main input[type="search"] {
    width: 100%;
    min-width: 0;
  }
}
`

const MobileUiStyles = () => {
  useEffect(() => {
    if (typeof document === "undefined") return

    let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement("style")
      el.id = STYLE_ELEMENT_ID
      el.setAttribute("data-bacoola", "admin-mobile-ui")
      document.head.appendChild(el)
    }
    // Always refresh the content so edits take effect on HMR / re-deploy.
    if (el.textContent !== MOBILE_CSS) {
      el.textContent = MOBILE_CSS
    }

    // Do NOT remove on unmount: the style must survive SPA route changes. It is
    // idempotent (single id), so re-mounts on other zones are harmless.
  }, [])

  return null
}

export const config = defineWidgetConfig({
  // Multiple zones so the injector mounts on whichever page the admin opens
  // first (the default landing is the order list). The id-guard makes duplicate
  // mounts a no-op. These are load points only — the widget renders nothing.
  zone: [
    "order.list.before",
    "product.list.before",
    "customer.list.before",
    "product.details.before",
    "order.details.before",
  ],
})

export default MobileUiStyles
