# Storefront changes — 2026-09-17

A running log of the storefront changes requested on 17 September 2026. Each
change is added here as it is agreed and built.

| # | Change | Status |
|---|--------|--------|
| 1 | Cookie consent banner | Built, not committed |
| 2 | Header "on either end" | Interpreted, awaiting confirmation |
| 3 | One thin underline weight on every hover underline | Built, not committed |
| 4 | Meta title and description per page | Built, not committed |
| 5 | Bacoola favicon | Built, not committed |
| 6 | robots.txt and sitemap.xml | Built, not committed |
| 7 | Sale prices in red | Built, not committed |
| 8 | Size selector as boxes (desktop) | Built, not committed |
| 9 | "See look" (shop the look) | Built, not committed |
| 10 | Admin favicon, title and description | Built, restart verification pending |
| 11 | Working newsletter sign-up | Built, not committed |

---

## 1. Cookie consent banner

### What was asked

A cookie banner shown at the start of a visit.

### What was decided

Two options were considered:

1. **Simple notice** — "We use cookies" with a single Accept button.
2. **Proper consent** — Accept all / Reject non-essential, with the choice
   stored and optional scripts allowed only after acceptance.

**Chosen: option 2, as a bottom bar.** It holds up under India's Digital
Personal Data Protection Act, 2023, and is ready for analytics or marketing
pixels without rework. No "Manage preferences" screen yet; there are no
separate cookie categories to manage.

### What was built

- **Component:** `apps/storefront/src/modules/common/components/cookie-consent/index.tsx`
- **Mounted in:** `apps/storefront/src/app/layout.tsx` (root layout), so it
  appears on every page, checkout included.

**Behaviour**

- Full-width black bar fixed to the bottom of the screen, matching the black /
  white style of the free-shipping popup.
- Short explanation plus a link to `/privacy-policy`, which already has a
  "Cookies" section.
- Two buttons: **Reject non-essential** and **Accept all**. On phones they sit
  side by side under the text.
- The choice is saved in a first-party cookie:
  - name `bacoola_cookie_consent`, value `accepted` or `rejected`
  - 1 year, `Path=/`, `SameSite=Lax`, `Secure` on HTTPS
  - a cookie rather than localStorage so server code can read it later
- The bar only renders after the page mounts in the browser, so returning
  visitors never see it flash.

**Helpers exported for future use**

| Export | Purpose |
|--------|---------|
| `getCookieConsent()` | Returns `"accepted"`, `"rejected"` or `null` |
| `hasNonEssentialConsent()` | `true` only when the visitor accepted |
| `COOKIE_CONSENT_EVENT` | `bacoola:cookie-consent` window event fired on choice, so a script can start right after Accept without a reload |
| `COOKIE_CONSENT_NAME` | The cookie name, for server-side reads |

### Is it real or just UI?

The **recording** of the choice is real; the **enforcement** has nothing to act
on yet.

Cookies the storefront sets today are all strictly necessary and are set
regardless of the choice (this is correct — they don't need consent):

| Cookie | Purpose |
|--------|---------|
| `_medusa_cart_id` | Keeps the shopping bag |
| `_medusa_jwt` | Keeps the customer logged in |
| `_medusa_cache_id` | Per-visitor cache key (middleware) |
| `_medusa_pending_customer` | Holds sign-up details during verification |
| `bacoola_cookie_consent` | Remembers the consent choice |

There are no analytics or advertising scripts (no Google Analytics, Tag Manager,
Meta Pixel, Clarity, etc.).

**Known gap:** the Google Maps embeds in the store locator
(`modules/stores/components/store-locator`) and the product-page store
availability panel (`modules/products/components/store-availability-panel`)
load regardless of the choice, and Google may set its own cookies through them.
Proposed follow-up: show a placeholder with "Load map" / "Open in Google Maps"
until the visitor accepts. Awaiting a decision.

### Rule for anything added later

Any analytics, marketing or other third-party script must not load unless
`hasNonEssentialConsent()` is true, and should listen for
`COOKIE_CONSENT_EVENT` to start when a visitor accepts mid-visit.

### Verified

- Desktop: bar appears on a first visit.
- Clicking Reject sets `bacoola_cookie_consent=rejected`, hides the bar, and it
  stays hidden after a reload.
- Mobile (375px): text wraps cleanly; the "Reject non-essential" label was
  wrapping onto two lines and was fixed with `whitespace-nowrap`.
- `/in`, `/in/cart` and `/in/privacy-policy` return 200.

The round "N" in the bottom-left corner during local testing is the Next.js
dev-mode badge, not part of the banner.

### Testing it again

Clear the choice in the browser console, then reload:

```js
document.cookie = "bacoola_cookie_consent=; Max-Age=0; Path=/"
```

---

## 2. Header "on either end"

### Interpretation (awaiting confirmation)

The desktop header already has three columns (categories left, logo centre,
Search / Log In / Wishlist / Bag right), but the row is capped at
`max-w-[1550px]` (`modules/layout/templates/nav/index.tsx`). On screens wider
than ~1630px the groups stop short of the edges and look bunched towards the
middle. Likely meaning: remove the cap so both groups always hug the screen
edges, logo stays centred. Not built yet — the exact meaning is being
confirmed with the manager.

---

## 3. Consistent thin hover underline

### What was asked

Hovering Log In and a mega-menu sub-category showed a thin line, but Wishlist
showed a visibly thicker one. Every hover underline must use the same thin
stroke.

### Cause

Three different underline techniques were in use:

1. `.nav-underline` (Wishlist, Bag, Search, categories, mega menu, footer,
   sitemap, cart, product cards) drew a `1px` *background* on a pseudo-element.
   At Windows display scaling (125% / 150%) a 1px background can land between
   device pixels and smear across two, so it reads as bolder.
2. Log In / account dropdown, while open, switched to a real `border-b` with
   different spacing. Borders snap to whole device pixels, so it read as thin.
3. Mega-menu tabs, the category sub-menu bar and the search category bar used
   `border-b-2` — genuinely 2px.

Legal / company pages also used `decoration-[1.5px]`, and plain `underline`
links took the font's default thickness, which is heavier on bold text.

### What changed

| File | Change |
|------|--------|
| `styles/globals.css` | `.nav-underline::after` now draws a `1px` border (`height: 0; border-bottom: 1px solid currentColor`) so it snaps to one device pixel |
| `styles/globals.css` | New `:where(*) { text-decoration-thickness: 1px }` — default weight for every text underline; zero specificity so utilities still win |
| `layout/components/login-dropdown`, `account-dropdown` | Open state uses `nav-underline nav-underline-active` instead of its own border — same line, same position |
| `layout/components/navigation/MegaMenu.tsx` | Tabs `border-b-2` → `border-b` |
| `categories/components/category-submenu-bar` | Active tab `border-b-2` → `border-b` |
| `search/components/search-category-bar` | `border-b-2` → `border-b` (active and hover) |
| 9 legal/company pages + `legal/components/layout` | `decoration-[1.5px]` → `decoration-1` |

Not changed on purpose: the checkout step progress bar (a progress indicator,
not an underline) and the price-range slider track.

### Verified

- At 125% scaling, the computed line on Women, Search, Log In, Wishlist and Bag
  is `0.8px` — exactly one device pixel.
- Hovering Log In (dropdown open), Women → Clothing in the mega menu, and
  Wishlist all show the same hairline in the same position.
- No console errors.

---

## 4. Meta title and description per page

### What was asked

Every page should have its own meta title (browser tab / Google headline) and
meta description (the snippet under it in Google).

### Problems found

- **Starter-template leftovers:** product titles were "… | Medusa Store" with
  the product name repeated as the description; category titles said
  "| Medusa Store | Medusa Store"; sign-in and profile descriptions mentioned
  "Medusa Store".
- **No brand name** on most pages ("Cart", "Help", "Store").
- **Weak or broken descriptions:** "View your cart", "Explore all of our
  products.", "You purchase was successful", 404 "Something went wrong"; the
  home page still advertised a "Summer Collection".
- **Missing metadata:** Women / Men / Teen / Kids landing pages,
  `/products/<department>` listings, order-transfer pages.
- **Private pages indexable:** cart, checkout, account, wishlist, order pages,
  verify-account, search results.
- **Broken category canonical:** a relative `women-clothing-v2` that resolved to
  the wrong URL.

### Decided scope

Items 1–6 below. **Skipped for now:** admin-editable per-product / per-category
SEO title and description (`metadata.seo_title` / `seo_description`).

### What was built

**1. Brand suffix everywhere** — `app/layout.tsx` sets
`title.template: "%s | Bacoola"`, a default title and description, and
`openGraph` site name / `en_IN` locale. Pages now set only their own name.
The home page uses `title.absolute` so the brand isn't appended twice.

**Shared helper** — `lib/util/seo.ts`:

| Export | Purpose |
|--------|---------|
| `SITE_NAME` | `"Bacoola"` |
| `NO_INDEX` | `{ index: false, follow: false }` for private pages |
| `toMetaDescription(text)` | Strips HTML/whitespace, cuts to ~155 chars at a word boundary with "…" |
| `getDepartment(handle)` | women / men / teen / kids → `Women's`, `Men's`, `Teen`, `Kids'` |
| `categorySeoName(category, all)` | Walks up to the department so titles read "Women's Dresses", not just "Dresses" |
| `categoryFallbackDescription(name)` | "Shop {name} at Bacoola. Discover the latest styles…" |

**2. Static pages** — rewritten titles and 110–160 character descriptions:

| Page | Title |
|------|-------|
| Home | Bacoola \| Modern Essentials & Luxury Couture |
| `/store` | Shop All Clothing & Accessories \| Bacoola |
| `/help` | Help & Customer Service \| Bacoola |
| `/returns` | Returns, Exchanges & Refunds \| Bacoola |
| `/company` | About Us \| Bacoola |
| `/careers` | Careers \| Bacoola (was "Work for Bacoola", which would read "Work for Bacoola \| Bacoola") |
| `/press` | Press & Media \| Bacoola |
| `/sitemap` | Site Map \| Bacoola |
| `/stores` | Store Locator \| Bacoola |
| `/contact` | Contact Us \| Bacoola |
| `/ethics` | Ethics Channel \| Bacoola |
| `/privacy-policy` | Privacy & Cookie Policy \| Bacoola |
| `/shipping-policy` | Shipping Policy \| Bacoola |
| `/refund-and-cancellation-policy` | Refund & Cancellation Policy \| Bacoola |
| `/terms-and-conditions` | Terms & Conditions \| Bacoola |
| 404 | Page Not Found \| Bacoola |

Policy, contact, ethics and responsibility descriptions were already specific
and kept.

**3. Department landing pages** (`/landingpage/[section]`) — new
`generateMetadata`: "Women's Clothing & Accessories | Bacoola" (same for Men's,
Teen, Kids') with a hand-written description each, a canonical URL and Open
Graph tags. `/landingpage/home` duplicates the home page, so its canonical
points to `/in`.

`/products/women|men|teen|kids` — "All Women's Clothing | Bacoola" etc., with a
canonical pointing to `/categories/<department>` (same listing).

**4. Product pages** — title is the product name; description is the product's
own description, cleaned and trimmed, falling back to "Shop {product} at
Bacoola. Choose your size and colour…". Canonical drops the `?v_id=` variant
parameter. Open Graph title, description and thumbnail match.

**5. Categories and collections**

- Category: "Women's Clothing | Bacoola", "Men's Jeans | Bacoola"; the
  department category itself is "All Women's Clothing". Categories outside a
  department (e.g. T-Shirts) keep their name. None of the 300 categories have a
  description yet, so all use the fallback. The department is found from the
  nav's cached category list — no extra backend request.
- Canonical fixed to `/in/categories/<handle>`.
- Collection: "{Title} Collection | Bacoola" with a fallback description and
  canonical.

**6. Kept out of Google (`noindex`)**

| Page(s) | Where set |
|---------|-----------|
| Cart, wishlist, verify-account, order confirmed, checkout, 404s | Page metadata |
| Everything under `/account` | `account/layout.tsx` |
| Order transfer (accept / decline) | New `order/[id]/transfer/[token]/layout.tsx` |
| Search results | `noindex, follow` — links to products are still followed |

The account layout repeats the title template, and the two slot pages on the
`/account` route itself use `title.absolute` ("Sign in | Bacoola",
"Account | Bacoola"): parallel-route slots there don't inherit the root
template.

Also fixed descriptions: cart, checkout, wishlist, addresses, profile and
sign-in (no more "Medusa Store").

### Not covered

- `app/field-parity/page.tsx` is a temporary client-side diagnostic page and
  can't export metadata; it should be deleted.
- Real category descriptions would beat the generated fallback; add them in
  the admin when ready.

### Verified

Rendered `<title>`, description, robots and canonical tags fetched from the dev
server for home, all four landing pages, a category, a department category,
T-Shirts, a product, `/products/men`, store, help, careers, cart, wishlist,
search, account, account/orders, the policy pages, company, contact, ethics,
press, responsibility, returns, sitemap, stores, verify-account and a 404. No
page has a doubled "Bacoola | Bacoola"; all public pages return 200. Type-check
reports no errors in the changed files.

---

## 5. Bacoola favicon

### What was asked

Replace the site favicon with the Bacoola logo icon: a bold white "B" on a
black square (supplied as an image in chat).

### Before

`public/favicon.ico` was still the Medusa starter template's icon (white
triangle in a black circle), and there was no Apple touch icon or web manifest.

### What was built

Source file: **`Group 1.png`** (project root), supplied after a first version
had been rebuilt from the wordmark. Its artwork is a 225×207 black rectangle
with a white B (margins left 17, top 9, right 9, bottom 12 px). Favicons must be
square, so black was added evenly above and below to make it 225×225; the B is
not stretched or moved sideways. The white B was upscaled 8x with its edges
re-sharpened, then every size below was rendered from a 1024px master.

| File | Size | Used for |
|------|------|----------|
| `src/app/favicon.ico` | 16, 32, 48 px | Browser tab |
| `src/app/icon.png` | 512 px | High-resolution tab / bookmark icon |
| `src/app/apple-icon.png` | 180 px | iPhone / iPad home screen |
| `public/icon-192.png`, `public/icon-512.png` | 192, 512 px | Android home screen (via manifest) |
| `src/app/manifest.ts` | — | Web manifest: name, theme colour, Android icons |

`public/favicon.ico` (the Medusa icon) was deleted; Next.js serves
`src/app/favicon.ico` in its place. The `src/app` files use Next.js's icon file
conventions, so the `<link rel="icon">`, `apple-touch-icon` and `manifest` tags
are generated automatically, with cache-busting hashes.

The source is only 225px, so the 512px icons are upscaled. If a designer
supplies an SVG or a 512px+ PNG, regenerate these same files from it.

### Verified

- `/favicon.ico`, `/icon.png`, `/apple-icon.png`, `/manifest.webmanifest`,
  `/icon-192.png` and `/icon-512.png` all return 200 with the right content
  type (the middleware does not redirect them).
- The served `/favicon.ico` is byte-identical to the new file.
- The page `<head>` has icon (48px and 512px), apple-touch-icon and manifest
  links.
- Browsers cache favicons hard: if the old triangle still shows, hard-refresh
  (Ctrl+Shift+R) or open the site in a new private window.

---

## 6. robots.txt and sitemap.xml

### What was asked

Add `robots.txt` and `sitemap.xml`, India (`/in`) pages only.

### Before

Neither existed. `/robots.txt` and `/sitemap.xml` returned an HTML page with
status 200 (locally and on bacoola.com), which search engines treat as a real
but useless page.

The footer "Site map" link (`/in/sitemap`) is a different thing: a page for
people, listing sections and categories. It is unchanged. `sitemap.xml` is a
machine-readable file for search engines and lists every product too.

### What was built

**`src/app/robots.ts` → `/robots.txt`**

- Allows everything except the private pages already marked `noindex` in
  change 4: `/in/cart`, `/in/checkout`, `/in/account`, `/in/wishlist`,
  `/in/order`, `/in/verify-account`, `/in/search`, plus `/api/` and the
  temporary `/field-parity` page.
- Points to the sitemap.

**`src/app/sitemap.ts` → `/sitemap.xml`**

| Section | Count (local data) | Priority | Change frequency |
|---------|--------------------|----------|------------------|
| Home | 1 | 1.0 | daily |
| Women / Men / Teen / Kids landing pages | 4 | 0.9 | daily |
| Store, help, returns, store locator, company, policy pages… | 15 | 0.2–0.8 | monthly / yearly |
| Categories (`/in/categories/<handle>`) | 490 | 0.7 | daily |
| Products (`/in/products/<handle>`) | 165 | 0.6 | weekly |

- Categories and products are read from the backend, so new ones appear
  automatically; `lastModified` is each item's `updated_at`.
- Only `handle` and `updated_at` are requested, without `region_id` (with it the
  store API returns full variants and prices whatever `fields` says).
- Paged 200 at a time, so it keeps working as the catalogue grows. A single
  sitemap file holds up to 50,000 URLs.
- Rendered on request (`force-dynamic`) so `next build` never needs the backend;
  the backend responses are cached for an hour.
- If the backend is unreachable, the sitemap still returns the 20 fixed pages
  instead of an error.
- Left out on purpose: `/products/women|men|teen|kids` (canonical points to
  `/categories/<department>`), `/landingpage/home` (duplicate of home), and all
  private pages.

Both files use `NEXT_PUBLIC_BASE_URL` for their links: `http://localhost:8000`
locally, `https://bacoola.com` in production (set in the VPS environment, see
`docs/HOSTINGER-VPS-DEPLOYMENT.md`). It is a `NEXT_PUBLIC_` variable, so it must
be present when the storefront image is built.

### After deploying

Submit `https://bacoola.com/sitemap.xml` in Google Search Console (Sitemaps).
This needs the site owner's Google account.

### Verified

- `/robots.txt` returns `text/plain` with the rules above.
- `/sitemap.xml` returns `application/xml`, parses as valid XML, and holds 675
  URLs: 20 fixed pages, 490 categories and 165 products, matching the backend
  counts.
- A sample of 35 sitemap URLs (all fixed pages plus a spread of categories and
  products) all return 200.

---

## 7. Sale prices in red

### What was asked

Show sale pricing in red.

### Before

Sale prices used four different colours depending on where they appeared:

| Where | Colour |
|-------|--------|
| Product card, mobile | Red `#D01313` |
| Product card, desktop | `text-ui-fg-interactive` — **blue** in the Medusa UI theme |
| Product page price and "-70%" | Blue (`text-ui-fg-interactive`) |
| Cart / order line items and "-%" | Blue (`text-ui-fg-interactive`) |
| Home featured products, cart "you may also like" carousel | Pink `rose-600` |

### What changed

A single Tailwind colour, `sale: "#D01313"` (`tailwind.config.js`), the same red
as the Sale links in the mega menu and side menu. Every discounted price and
discount percentage now uses `text-sale`:

| File | What turns red |
|------|----------------|
| `products/components/product-preview/price.tsx` | Card sale price, mobile and desktop (`!text-sale` on desktop to beat the muted base colour) |
| `products/components/product-price/index.tsx` | Product page price and `-NN%` |
| `common/components/line-item-price/index.tsx` | Cart / order line total and `-NN%` |
| `common/components/line-item-unit-price/index.tsx` | Cart unit price and `-NN%` |
| `home/components/featured-products/showcase.tsx` | Featured products sale price |
| `cart/components/carousel.tsx` | Cart carousel sale price |

The struck-through original price stays grey everywhere. Regular (non-sale)
prices are unchanged. The promo banner keeps its own darker red background
(`#BA0000`).

### Verified

- Product page for the local sale product (`men-sale-demo`, ₹10,000 → ₹3,000):
  "From ₹3,000.00" and "-70%" render `rgb(208, 19, 19)`; "Original: ₹10,000.00"
  is grey and struck through.
- Sale category card: sale price `rgb(208, 19, 19)`, original price grey.
- The generated CSS contains `.text-sale` and `.!text-sale` with `#D01313`.
- Cart line items weren't exercised with a real sale item in the bag; they use
  the same `text-sale` class.

Note: while verifying, the dev overlay showed "unable to decode image data" for
`icon.png` / `favicon.ico`. That was Turbopack reading the files mid-write
during change 5; all icon files decode correctly and are served with 200.

---

## 8. Size selector as boxes (desktop)

### What was asked

On mango.com the product page shows sizes as a row of boxes; Bacoola showed them
as a vertical list of rows. Change Bacoola to boxes.

### Before

- **Desktop** (`lg` and up): a vertical list, one full-width row per size,
  scrolling after ~6 sizes; the selected size had a grey background.
- **Mobile**: already a box grid, inside the "Choose your size" bottom sheet
  that opens on ADD. Unchanged.

### What changed

`modules/products/templates/CustomProductDetails.tsx`, desktop size option only:

- Grid of **5 boxes per row**, wrapping onto more rows for longer size runs;
  grid capped at 350px wide (≈70px boxes), matching the reference.
- Each box is 60px tall, size label top-left.
- Borders overlap into single 1px light-grey lines (`-mt-px -ml-px`), like a
  table.
- **Selected:** dark (`neutral-800`) outline on all four sides, raised above
  its neighbours. `aria-pressed` marks it for screen readers.
- **Hover / keyboard focus:** mid-grey outline.
- **Sold out:** grey, struck-through label with the bell icon underneath;
  clicking still opens the back-in-stock "notify me" panel instead of selecting.
- The old 251px scroll area is gone; every size is visible.

### Verified

- `men-sale-demo` (S, M, L, XL, XXL) at 1100px and 1440px wide: one row of five
  71×60px boxes.
- Clicking M: `aria-pressed="true"`, border `rgb(38, 38, 38)`, raised; the other
  boxes keep the light border; the ADD button activates.
- Not seen live: the sold-out look. No local product has an out-of-stock size;
  the click-to-notify behaviour is unchanged from before.

---

## 9. "See look" (shop the look)

### What was asked

Mango's product page has a **SEE LOOK** button that opens a "Look items" panel
listing every product the model is wearing. Build the same: the admin links
products (not images) to a product, per colour like the image arrangement, and
**the button is hidden on products with no look set up**.

### How it works

**Admin** — new widget `apps/backend/src/admin/widgets/product-look.tsx`, a
"See look" box on each product's page (below Measurements / Details):

1. Pick which look to edit: **All colours** or a specific colour (chips show
   how many items each has).
2. Search products by name; for a product with colours, choose **which colour is
   worn** (white jeans, not just "jeans").
3. Reorder with ↑ / ↓, remove, then **Save**.

Saved on the product as `metadata.look`:

```json
{
  "default": [{ "product_id": "prod_…", "variant_id": "variant_…" }],
  "colours": { "navy": [{ "product_id": "prod_…", "variant_id": "variant_…" }] }
}
```

`variant_id` is any variant of the chosen colour of the linked product. Saving
with every list empty clears the key.

**Storefront**

| File | Role |
|------|------|
| `lib/util/look.ts` | Types, `parseLook`, `lookForColour` (colour's own look, else the default) |
| `lib/data/look.ts` | `getResolvedLook`: fetches the linked products server-side in one request and turns them into listing-style tiles (`toProductCards`) |
| `app/[countryCode]/(main)/products/[handle]/page.tsx` | Resolves the look and passes it to the product template |
| `modules/products/templates/CustomProductDetails.tsx` | **SEE LOOK** button (outlined, full width, under ADD on desktop and mobile), follows the selected colour |
| `modules/products/components/look-panel/index.tsx` | "Look items" slide-over (shared `PanelShell`): 2 tiles per row with photo, name, price (sale in red), heart; clicking opens the product on the linked colour |

**When the button is hidden / items are skipped**

- No look saved on the product → no button (no extra request either).
- Colour on screen has no look of its own → uses **All colours**; if that is
  empty too → no button.
- A linked product that is deleted or unpublished → skipped.
- A linked colourway with nothing in stock (or the whole product, when no
  colour was chosen) → skipped. If every item is skipped, the button is hidden.
- The same product + colour added twice → shown once.

Colour looks are keyed by the Colour option **value**; renaming a colour in
admin orphans its look (re-add it under the new name).

### Verified (local data, restored afterwards)

A test look was written directly to the local database on "Fine knit cotton
blend T-shirt" (navy / beige / black / tan / olive), with the original
`metadata` backed up and restored after testing:

- **Navy** (own look of 4 links, one to a non-existent product): panel shows
  the 3 real items with image, title, price, heart, and links to the right
  product and colour; the missing product is skipped.
- **Beige** (no own look): falls back to the default look (striped polo, black
  slim-fit tee).
- **Slim fit T-shirt 180gsm** (no look): no SEE LOOK button.
- **Mobile (375px)**: SEE LOOK full-width under ADD.
- Admin widget compiles (esbuild) and the backend logs no errors.

**Not exercised:** the sold-out skip (no local stock changes were made).

### Follow-up tweaks

**Panel sized to Mango exactly.** Measured from Mango's "Look items" dialog
(`ol` 350 × 332.3, padding `0 0 16px`):

| Part | Size |
|------|------|
| Panel | 416px wide, 32px side padding |
| List | 350px wide, two flush 175px columns, 16px bottom padding, 16px between rows |
| Photo | 175 × 249 |
| Name row (name + heart) | 20px, 8px below the photo, 12px text |
| Price row | 20px, 2px below the name |
| Text block under the photo | 67px |

Measured on the storefront afterwards: panel 416, list 350 × 332 with padding
`0px 0px 16px`, photo 175 × 249, text block 67.

**Admin colour prompt.** "Which colour is worn?" was unclear. Now:

- A linked product with **one colour** is added straight away (its only colour
  is recorded), no question asked.
- For products with several colours the button reads **Add**, and the prompt
  is **"Which colour is in the photo?"**.

**Admin widget confirmed in use:** a look saved from the admin on "Linen blend
striped T-shirt" is stored correctly in `metadata.look` and shows on the
storefront.

---

## 10. Admin panel favicon, title and description

The Medusa admin (`localhost:9000/app`) showed an empty favicon and titles like
"Orders - Medusa". `apps/backend/src/lib/admin-branding-plugin.ts` (the existing
Vite plugin that brands the admin) now also injects into the admin's
`index.html`:

- **Favicon:** the storefront "B" icon at 48px, 192px and a 180px Apple touch
  icon (`src/admin/assets/admin-*.png`, inlined as data URIs); the bundler's
  empty placeholder favicon is removed.
- **Title:** "Bacoola Admin". The dashboard sets per-page titles through
  react-helmet with a hard-coded " - Medusa" suffix, so a small script watches
  `<title>` and rewrites it: "Orders - Medusa" → "Orders | Bacoola Admin".
- **Description:** "Bacoola store administration: manage products, orders,
  customers, inventory and content."
- **`noindex, nofollow`:** keeps the admin login out of search engines.

The plugin is read from `medusa-config.ts`, so the backend must be restarted to
pick it up. The backend was restarted; the rendered head tags were not yet
checked when this was written.

---

## 11. Working newsletter sign-up

### What was wrong

The footer form ("10% off your next purchase by subscribing to the newsletter")
did nothing: `onSubmit` only called `preventDefault()`. No email was saved, no
feedback shown, no discount existed. Two other newsletter components (home
"Stay Inspired", cart) were unused and also fake (a local "thank you" / an
`alert`). The account **My subscriptions** checkboxes saved nothing.

### Decisions

- **Remove the 10% promise** (no discount).
- Include an **admin subscriber list**, a **working My subscriptions** page and
  an **unsubscribe link** in emails.

### Backend

| File | Purpose |
|------|---------|
| `src/modules/newsletter/` | New module, table `newsletter_subscriber`: `email` (unique, lower-cased), `status` subscribed / unsubscribed, `source` footer / account, `customer_id`, `interests` (women / men / teen / kids), `unsubscribe_token` (unique, random), `subscribed_at`, `unsubscribed_at`. Migration `Migration20260917105517`. Registered in `medusa-config.ts`. |
| `src/lib/newsletter.ts` | `subscribe()` creates or reactivates a row and sends the welcome email; an already active address returns `already_subscribed` with no second email. `unsubscribeRow()`, `unsubscribeUrl()`. |
| `src/lib/email-templates.ts` | `buildNewsletterWelcomeEmail` (same shell as order emails) with an Unsubscribe link. |
| `src/lib/email.ts` | `sendEmail` accepts optional `headers`; the welcome email sets `List-Unsubscribe`. |
| `POST /store/newsletter` | `{ email }` → 201 `subscribed` / 200 `already_subscribed` / 400 invalid email. |
| `POST /store/newsletter/unsubscribe` | `{ token }` → 200 `{ status, email }` / 404 unknown token. POST so mail scanners pre-fetching links can't unsubscribe anyone. |
| `GET/POST /store/customers/me/newsletter` | Logged-in customer's `{ subscribed, interests }`; auth via Medusa's built-in `/store/customers/me*` middleware. |
| `GET /admin/newsletter-subscribers` | Paged list, `q` (email search), `status` filter, total active count. |
| `GET /admin/newsletter-subscribers/export` | CSV (active by default, `status=all` for everything), formula-injection safe. |
| `src/admin/routes/newsletter/page.tsx` | **Newsletter** page in the admin sidebar: search, status filter, table, paging, **Export CSV**. |

Unsubscribed rows are kept (consent history); re-subscribing reuses the row and
its token.

### Storefront

| File | Purpose |
|------|---------|
| `lib/data/newsletter.ts` | Server actions calling the backend from the Next server (no browser CORS; the customer JWT stays in its httpOnly cookie). |
| `modules/layout/components/newsletter-form` | Footer form: heading now **"Subscribe to our newsletter"**, button shows "SIGNING UP...", result shown under the form ("Thank you for subscribing…", "You're already subscribed…", or the error in red). |
| `account/@dashboard/subscriptions` + `modules/account/components/subscriptions-form` | Loads and saves real preferences. Contents: Woman / Man / Teen / Kids. Channels: **e-mail only** (the SMS and Post boxes were removed — nothing can send those). Unchecking e-mail unsubscribes. |
| `app/[countryCode]/(main)/newsletter/unsubscribe` | Unsubscribe page for email links; runs the unsubscribe in the browser on arrival, `noindex`, and disallowed in `robots.txt`. |
| Removed | Unused fake `home/components/newsletter` and `cart/components/newsletter.tsx`. |

### Verified (local)

- API: invalid email → 400; an existing subscriber submitted as
  `"  Newsletter-Test@Example.invalid "` → 200 `already_subscribed` (trimmed and
  lower-cased, no duplicate, no email); unknown unsubscribe token → 404; admin
  and customer routes without login → 401.
- Footer form in the browser shows "You're already subscribed to our
  newsletter."
- Unsubscribe page with the test token: "…has been unsubscribed…", the row's
  status became `unsubscribed` with `unsubscribed_at` set; `noindex` present.
  The test row was deleted afterwards.
- A real sign-up from the footer (a Gmail address, 16:32) was saved and the
  backend log shows `[email] sent "Welcome to the Bacoola newsletter"`.
- Backend and storefront type-check clean for the new files; backend logs show
  no errors.

**Not exercised here:** the admin Newsletter page and My subscriptions page in a
logged-in session.

### Deploying

The production database needs the new table: run `npx medusa db:migrate` on the
server (the VPS deploy runs migrations if configured to; check
`docs/HOSTINGER-VPS-DEPLOYMENT.md`). `STOREFRONT_URL` must be set (already used
by back-in-stock emails) so unsubscribe links point at the live site.
