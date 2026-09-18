import fs from "fs"
import path from "path"

/**
 * Bacoola branding for admin pages that have no widget injection zone.
 *
 * `src/admin/widgets/login-branding.tsx` already brands the login screen, but
 * widgets can only mount where @medusajs/admin-shared defines a zone, and the
 * only auth-page zones that exist are `login.before` / `login.after`. The
 * password-reset and invite screens have none, and neither does the sidebar —
 * so neither can be reached by a widget at all.
 *
 * What every one of those places *does* share is the admin's single index.html.
 * This Vite plugin adds to its <head>: the tab title, description, robots and
 * favicon (see ICONS / TITLE_SCRIPT below), and one stylesheet, which the
 * dashboard then carries onto every route. Two things are restyled:
 *
 *   1. LogoBox — the dark rounded square holding Medusa's mark, rendered on the
 *      reset-password and invite screens. Turned into the Bacoola wordmark.
 *   2. The sidebar store-name button — the word "Bacoola" as plain text.
 *      Replaced by the same wordmark.
 *
 * Deliberately CSS-only. The obvious alternative — a script that rewrites the
 * DOM — has to fight React: the dashboard owns these nodes and re-renders them
 * (the sidebar re-renders whenever the store query refetches), so anything we
 * inserted would be reconciled away, and a MutationObserver putting it back can
 * corrupt React's tree. Styling nodes React already owns sidesteps all of it.
 *
 * Selectors match the dashboard's compiled Tailwind classes, which is a real
 * coupling: a dashboard upgrade that renames them makes the branding silently
 * revert to Medusa's. That is the failure mode to expect, and it is cosmetic —
 * nothing here can break the admin itself. Verify these two screens after any
 * @medusajs/dashboard bump.
 */

/** The wordmark, shared with the login widget. */
const LOGO_PATH = path.resolve(__dirname, "../admin/assets/bacoola-logo.png")

/**
 * The storefront's "B" favicon (apps/storefront/src/app/icon.png and
 * apple-icon.png), copied in at the sizes a browser tab and a home-screen
 * bookmark want. Inlined as data URIs for the same /app base-path reason as the
 * wordmark.
 */
const ICONS = [
  { file: "admin-favicon.png", rel: "icon", sizes: "48x48" },
  { file: "admin-icon-192.png", rel: "icon", sizes: "192x192" },
  { file: "admin-apple-icon.png", rel: "apple-touch-icon", sizes: "180x180" },
]

export const ADMIN_TITLE = "Bacoola Admin"
const ADMIN_DESCRIPTION =
  "Bacoola store administration: manage products, orders, customers, inventory and content."

/**
 * The dashboard titles every route itself through react-helmet as
 * "<Page> - Medusa" (or just "Medusa"), from a hard-coded suffix in
 * @medusajs/dashboard. There is no config for it, and its module is pre-bundled
 * by Vite, so it can't be rewritten at build time either. Instead this watches
 * <title> and swaps the suffix whenever Helmet writes it: "Orders | Bacoola
 * Admin". Helmet owns document.title, not a React-rendered node, so rewriting it
 * can't upset React's reconciliation. The equality check stops the observer
 * reacting to its own write.
 */
const TITLE_SCRIPT = `
(function () {
  var BRAND = ${JSON.stringify(ADMIN_TITLE)};
  function brand(t) {
    if (!t || t === "Medusa") return BRAND;
    var SUFFIX = " - Medusa";
    if (t.slice(-SUFFIX.length) === SUFFIX) return t.slice(0, -SUFFIX.length) + " | " + BRAND;
    return t;
  }
  function apply() {
    var next = brand(document.title);
    if (next !== document.title) document.title = next;
  }
  apply();
  new MutationObserver(apply).observe(document.head, {
    subtree: true,
    childList: true,
    characterData: true,
  });
})();
`.trim()

/**
 * LogoBox's own classes, from @medusajs/dashboard's logo-box.tsx. The `after:`
 * utilities in its class list are skipped — a `:` in a class selector needs
 * escaping, and these four are already specific enough.
 */
const LOGO_BOX = "div.bg-ui-button-neutral.shadow-buttons-neutral.size-14.rounded-xl"

/**
 * The sidebar store button is a 3-column grid; its middle cell holds the store
 * name. Matched on the arbitrary-value Tailwind class as a substring, because
 * the brackets in `grid-cols-[24px_1fr_15px]` would otherwise need escaping.
 */
const STORE_BUTTON = '[class*="grid-cols-[24px_1fr_15px]"]'
const STORE_NAME = `${STORE_BUTTON} > div.block.overflow-hidden.text-start`

function css(logoDataUri: string): string {
  return `
/* ── Bacoola admin branding (injected by admin-branding-plugin.ts) ────────── */

/* The wordmark is inlined rather than emitted as a file so the stylesheet has
   no asset URL to get wrong under the admin's /app base path. It is held in a
   custom property because both rules below need it, and a base64 PNG is ~36KB
   — worth not paying for twice. */
:root {
  --bacoola-logo: url("${logoDataUri}");
}

/* 1. Reset-password / invite: Medusa's LogoBox → the Bacoola wordmark.
      The box is a 56px dark square; the wordmark is wide and dark, so the
      square's background, gradient overlay and shadow all have to go. */
${LOGO_BOX} {
  width: 180px !important;
  height: 44px !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background-color: transparent !important;
  background-image: var(--bacoola-logo);
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}
${LOGO_BOX} > svg {
  display: none !important;
}
/* The gradient sheen the square draws over itself. */
${LOGO_BOX}::after {
  content: none !important;
}

/* 2. Sidebar: the store name text → the same wordmark.
      visibility (not display) keeps the text's box, so the row height and the
      grid column stay exactly as the dashboard laid them out. */
${STORE_NAME} {
  background-image: var(--bacoola-logo);
  background-repeat: no-repeat;
  background-position: left center;
  background-size: auto 13px;
  min-height: 20px;
}
${STORE_NAME} > * {
  visibility: hidden;
}
[dir="rtl"] ${STORE_NAME} {
  background-position: right center;
}

/* The "B" store avatar, dropped so the wordmark stands alone. Its grid column
   has to go with it: hiding a grid item removes it from flow entirely, so the
   two survivors would otherwise slide up into the 24px and 1fr tracks and
   squash the wordmark into 24px. Re-declaring the template as "1fr 15px" puts
   the name back on the wide track and leaves the chevron on the narrow one. */
${STORE_BUTTON} {
  grid-template-columns: 1fr 15px !important;
}
${STORE_BUTTON} > :first-child {
  display: none !important;
}

/* 3. Dark theme: the wordmark is near-black and vanishes on a dark surface.
      brightness(0) flattens it to solid black, invert(1) makes it solid white —
      the standard trick for recolouring a single-colour raster mark. */
html.dark ${LOGO_BOX},
html.dark ${STORE_NAME} {
  filter: brightness(0) invert(1);
}
`.trim()
}

/**
 * Vite plugin. Returned to Medusa from `admin.vite` in medusa-config.ts, where
 * mergeConfig concatenates it onto the bundler's own plugin list.
 */
export function bacoolaAdminBranding() {
  return {
    name: "bacoola-admin-branding",

    transformIndexHtml(html: string) {
      let logo: Buffer

      try {
        logo = fs.readFileSync(LOGO_PATH)
      } catch {
        // Never fail the admin build over branding. Without the asset the
        // dashboard simply looks like stock Medusa, which is survivable; a
        // build that dies here is not.
        console.warn(
          `[bacoola] admin branding skipped — no logo at ${LOGO_PATH}`
        )
        return html
      }

      const dataUri = `data:image/png;base64,${logo.toString("base64")}`

      const iconTags = ICONS.flatMap(({ file, rel, sizes }) => {
        try {
          const png = fs.readFileSync(path.resolve(__dirname, "../admin/assets", file))
          return [
            {
              tag: "link",
              attrs: { rel, type: "image/png", sizes, href: `data:image/png;base64,${png.toString("base64")}` },
              injectTo: "head" as const,
            },
          ]
        } catch {
          console.warn(`[bacoola] admin favicon ${file} missing — skipped`)
          return []
        }
      })

      return {
        // The bundler ships an empty placeholder favicon; drop it so the browser
        // doesn't prefer it over ours.
        html: html.replace(/<link[^>]*data-placeholder-favicon[^>]*>/, ""),
        tags: [
          { tag: "title", children: ADMIN_TITLE, injectTo: "head" as const },
          {
            tag: "meta",
            attrs: { name: "description", content: ADMIN_DESCRIPTION },
            injectTo: "head" as const,
          },
          // A login screen for store staff has no business in search results.
          {
            tag: "meta",
            attrs: { name: "robots", content: "noindex, nofollow" },
            injectTo: "head" as const,
          },
          ...iconTags,
          { tag: "script", children: TITLE_SCRIPT, injectTo: "head" as const },
          {
            tag: "style",
            attrs: { "data-bacoola-branding": "" },
            children: css(dataUri),
            injectTo: "head" as const,
          },
        ],
      }
    },
  }
}
