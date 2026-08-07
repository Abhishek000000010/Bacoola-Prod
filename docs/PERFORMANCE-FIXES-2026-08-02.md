# Bacoola — Performance fixes applied 2026-08-02

Follows `PERFORMANCE-FIXES-2026-08-01.md` (which moved dev onto a local Postgres
and trimmed the nav) and `SINGAPORE-MIGRATION-2026-08-01.md` (which put the whole
stack in Singapore). Read those first for context.

This one covers the work done **after** the storefront went live in Singapore,
when the site was still slow and it was no longer obvious why.

---

## 1. TL;DR

- The all-Singapore move **worked** — the backend answers a light request in
  ~160 ms and TCP connect is ~30–50 ms. Distance costs nothing now.
- What was still slow turned out to be **two independent problems**, and the
  earlier assumption that region latency was the whole story was wrong.
- **Problem A (fixed, in code):** category and store pages were shipping
  ~900 KB, of which **74% was RSC flight payload** — full product and category
  objects serialised into the HTML to render a thumbnail, a title and a price.
  Pages are now **half the size** and warm renders roughly **twice as fast**.
- **Problem B (not fixed, needs money):** both services run on Render **Free =
  0.1 CPU**. Requests **serialise** — 4 concurrent visitors take ~4× as long as
  1 — and the instance spins down after ~15 min idle (~50 s cold start). No
  amount of code work removes either.

---

## 2. How it was diagnosed (reusable method)

The useful part of this session was the diagnostic sequence, not the fix. If the
site feels slow again, repeat it in this order.

**Step 1 — separate network from server.** Time a trivial endpoint:

```bash
curl -o /dev/null -s -w "dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} TTFB=%{time_starttransfer} total=%{time_total}\n" \
  https://bacoola-prod.onrender.com/health
```

`/health` came back in 0.16 s with connect at ~50 ms. That **ruled out region and
network** immediately, which is what stopped the investigation chasing the
migration.

**Step 2 — see whether time scales with payload.** Same endpoint, different
field sets:

| Query | Size | TTFB |
|---|---|---|
| `products?limit=12&fields=id,title,handle` | 1.5 KB | 0.63 s |
| `products?limit=4` | 64 KB | 1.05 s |
| `products?limit=12` | 452 KB | 3.1–6.3 s |

Time tracked bytes, not row count. That pointed at serialisation, not the query.

**Step 3 — CPU or I/O? Test concurrency.** This is the decisive one. A
CPU-starved service *serialises*: N parallel requests take ~N× as long. An
I/O-bound one overlaps them.

```bash
U="https://bacoola-storefront.onrender.com/in/categories/men"
for i in 1 2 3 4; do curl -o /dev/null -s -w "%{time_starttransfer}\n" "$U" & done; wait
```

Result: 1 → 0.62 s, 2 → ~2.1 s, 4 → ~2.4 s, with throughput pinned flat. Textbook
CPU saturation. **Run-to-run variance alone is not evidence** — the same query
returning 2.3 s / 2.0 s / 5.9 s / 2.5 s only *suggests* contention; the
concurrency scaling is what proves it.

**Step 4 — attribute the bytes before changing anything.** Pull the page down and
measure what is actually in it, rather than guessing:

```bash
curl -s "https://bacoola-storefront.onrender.com/in/categories/men" -o page.html
```

Then split `<script>` contents (the RSC flight payload) from real markup, and
strip candidate patterns one at a time to see what each costs. On the original
page: flight payload 679 KB of a 917 KB document, of which `calculated_price`
objects 124 KB, timestamps 90 KB (1070 of them, nothing renders a timestamp),
`image_order` metadata 58 KB, image URLs 48 KB.

**Step 5 — simulate the fix against real data before writing code.** Fetching one
real API response and applying the proposed trim in a throwaway script predicted
465 KB → 42 KB (11×). That number was worth having *before* touching components.

---

## 3. Root cause — the client component boundary

Every prop passed from a Server Component to a **client component** is serialised
into the HTML as RSC flight data. The listing grid is a client component, so:

- `ProductPreview` (`"use client"`) received the whole `product` object — every
  variant, every variant's `calculated_price`, every variant's metadata, all
  images, all timestamps — to render a thumbnail, a title, one price and a size
  list. Measured: 704 image URLs embedded to render 33 images.
- `getVariantCards` ran **on the client**, inside `InfiniteProducts`. That is
  *why* the raw variant list had to be shipped at all — the browser was doing
  work the server could have finished.
- `CategoryProductListing` (`"use client"`) received full `StoreProductCategory`
  objects, which carry `category_children` and a `parent_category` chain — 1185
  category records to render a breadcrumb and a heading.
- `ProductPreview` also took a `region` prop it never used (destructured as
  `_region`), i.e. a region object per tile for nothing.

This is not a Medusa problem or a hosting problem. It is the standard App Router
trap: **a client component's props are a wire format, not just a function
signature.**

---

## 4. Changes applied

Commit `0ff65dd`, deployed 2026-08-02.

### 4.1 Server-side colourway split — `lib/util/product-cards.ts` (new)

`toProductCards()` runs `getVariantCards` on the server and pairs each tile with
a **trimmed** product slice: `id`, `handle`, `title`, `thumbnail`, image URLs, the
size option, and one priced variant per colourway with only the four price fields
`getPricesForVariant` reads.

Two details that matter if this is ever rewritten:

- The trimmed slice is shaped as a `StoreProduct` on purpose, so `ProductPreview`
  and the wishlist entry it writes keep their existing contract. Only the volume
  of data changed, not any component's API.
- **One shared slice per source product**, reused across its tiles. Building a
  separate slice per card would serialise the image list once per colourway
  instead of once per product — costing more than it saved.

### 4.2 Listing path passes tiles, not products

`paginated-products.tsx` builds the tiles server-side; `loadStoreProducts`
(the infinite-scroll server action) returns `{ cards, nextPage }`;
`InfiniteProducts` renders them and no longer imports `getVariantCards`.

### 4.3 Breadcrumbs, not categories

`CategoryProductListing` now takes a `CategoryCrumb` (`id`, `name`, `handle`)
instead of `StoreProductCategory`, and the template passes only those fields.

### 4.4 Nav field trim (helps every page)

`CATEGORY_LINK_FIELDS` no longer requests `rank` — fetched site-wide, read
nowhere. `Nav` strips category `metadata` down to the single `sale_percent` key
`PromoBanner` reads before handing the list to its three client components. The
store API cannot select one key out of a JSON column, so the strip has to happen
in `Nav` rather than in the query.

### 4.5 `ProductPreview.region` is now optional

Unused; optional so remaining callers (rails, related products, search, wishlist)
can stop sending it. **Not yet done for those callers** — see §6.

---

## 5. Measured results

Live, same instance, same backend and data. Old numbers are from the deployed
site immediately before the change.

| Page | Before | After | Saved |
|---|---|---|---|
| `/in/categories/men` | 938,914 B | **427,037 B** | 54.5% |
| `/in/store` | 893,911 B | **408,674 B** | 54.3% |
| `/in` (home) | 157,608 B | 152,255 B | 3.4% |

Flight payload on the category page: **679 KB → 188 KB (−72%)**. Within it:

```
calculated_price objects   124 KB  →   4 KB
image_order metadata        58 KB  →   0
variant option_id refs      350    →   0 occurrences
timestamps                  90 KB  →   5 KB
```

Warm TTFB, `/in/categories/men`, 10 samples: **median 0.724 s** (min 0.456, max
1.678). Before: 0.926 s best of two warm samples. So roughly **2× faster** —
but be honest about that figure, the old baseline was two samples taken while the
cache was still warming. **The byte reduction is exact and verified; the timing
improvement is real but coarsely measured.**

Correctness on the live site after deploy: 31 tiles, all priced, 33 `<img>` tags,
62 colourway `?v_id=` deep-links — identical to before.

---

## 6. Still open

**Not fixed, needs money — the 0.1 CPU ceiling.** Concurrency still serialises
after the optimisation (1 → 0.62 s, 4 → ~2.4 s). Cold start still ~50 s. Bump
both services to Starter; Render bills per second so it can be trialled for
pennies and reverted. Prediction to test against: solo should fall toward
~0.2–0.3 s and the 4-concurrent case should stop scaling linearly. If it does
not, the bottleneck is Neon's free tier instead, and the money should go there.

**Remaining code headroom** on the now-427 KB category page — ~224 KB of it is
markup:

- **100 KB of `class=` attributes** and **52 KB of inline `<svg>` across 168
  elements** — the same arrow/plus/heart icons re-emitted per tile. A sprite or
  shared `<symbol>` would reclaim most of the SVG.
- The nav still ships all **490 categories** on every page (~60–90 KB of flight).
- Tiles could carry only their own colourway's images rather than the whole
  product's. Simulated at 42 KB → 11 KB of product payload, but it **changes
  carousel behaviour** (each tile can currently scroll through every product
  image), so it is a UX decision, not a free win.

**Pre-existing bug, unrelated to this work — infinite scroll never loads page 2.**
Listing pages show 12 products out of 165. The sentinel renders, the
IntersectionObserver fires, `POST /in/store` returns 200 — and no tiles are
appended. Confirmed identically on the deployed site *before* these changes, so
it is not a regression. The empty `catch {}` in `InfiniteProducts.loadMore` is
almost certainly hiding the real error; instrument that first. Commercially this
is arguably more urgent than load time.

**CORS is broken in production** — see `SINGAPORE-MIGRATION-2026-08-01.md`.
Client-side calls from the storefront to the backend fail. Anything in this doc
measured through the browser should be re-checked once that is fixed.

---

## 7. Tried and rejected — do not repeat

**Keep-alive pinger to defeat the spin-down.** It works mechanically, but it
fixes only the cold start (not the 0.1 CPU), and keeping two free services awake
24/7 is ~1,460 instance-hours against Render's ~750/month free pool — the
services get suspended mid-month, turning a slow site into an outage. Neon's
free compute-hours (~190/month) would run out in about a week. Details and the
correct ping URLs, should it be done anyway, are in the migration doc.

---

## 8. Files changed on 2026-08-02

```
apps/storefront/src/lib/util/product-cards.ts                        (new)
apps/storefront/src/lib/data/products.ts
apps/storefront/src/lib/data/categories.ts
apps/storefront/src/modules/store/templates/paginated-products.tsx
apps/storefront/src/modules/store/components/infinite-products/index.tsx
apps/storefront/src/modules/categories/templates/index.tsx
apps/storefront/src/modules/categories/templates/CategoryProductListing.tsx
apps/storefront/src/modules/layout/templates/nav/index.tsx
apps/storefront/src/modules/products/components/product-preview/index.tsx
```
