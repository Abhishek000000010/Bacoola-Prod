"use client"

import { useMemo, useState } from "react"
import { Clock, MapPin, Navigation, Phone, Search, X } from "lucide-react"
import { Store, storeAddress } from "@lib/legal-config"

/**
 * Store locator: searchable list on the left, map on the right.
 *
 * The map is the classic keyless Google Maps embed, queried by the store's
 * ADDRESS rather than by latitude/longitude. That is deliberate — hardcoding
 * coordinates nobody has surveyed would put the pin somewhere plausible but
 * wrong, and on this page a wrong pin sends a customer to the wrong building.
 * Letting Google geocode the address it is given keeps the pin honest, and
 * needs no API key.
 *
 * The search box filters the real list. It is not decorative: with one store it
 * is nearly pointless, but a control that looks functional and does nothing is
 * worse than no control, and this costs four lines.
 */

const mapSrc = (store: Store): string =>
  `https://maps.google.com/maps?q=${encodeURIComponent(
    storeAddress(store)
  )}&output=embed`

const directionsHref = (store: Store): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    storeAddress(store)
  )}`

/** Shared shape for the two actions under the map. */
const actionClass =
  "inline-flex items-center justify-center gap-x-2 h-[46px] px-6 border border-neutral-950 " +
  "text-[12px] font-bold uppercase tracking-[0.05em] text-neutral-950 " +
  "hover:bg-neutral-950 hover:text-white transition-colors"

export default function StoreLocator({ stores }: { stores: Store[] }) {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(stores[0]?.id ?? "")

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return stores
    return stores.filter((store) =>
      [store.name, store.city, store.state, store.postalCode, ...store.addressLines]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
  }, [stores, query])

  // Keep the map on a store that is still visible after filtering.
  const selected =
    matches.find((store) => store.id === selectedId) ?? matches[0] ?? null

  // The map column is flush to the right edge -- no container padding on that
  // side -- so it reads as part of the page rather than a boxed widget. The
  // list keeps the page's normal left padding.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-10 lg:gap-8">
      <div className="px-4 md:px-8 lg:px-10">
        <form
          onSubmit={(event) => event.preventDefault()}
          className="relative mb-8"
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by city or postcode"
            aria-label="Search stores by city or postcode"
            className="w-full h-[52px] pl-11 pr-11 border border-neutral-300 text-[12px] text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-950 transition-colors [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-950 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-neutral-950 mb-5">
          {matches.length} {matches.length === 1 ? "store" : "stores"}
        </p>

        {matches.length === 0 ? (
          <p className="text-[12px] text-neutral-900 leading-[1.8]">
            No stores match “{query}”. We currently have{" "}
            {stores.length === 1 ? "one store" : `${stores.length} stores`}, so
            try a wider search — or shop the full range online.
          </p>
        ) : (
          <ul className="flex flex-col gap-y-4">
            {matches.map((store) => {
              const active = selected?.id === store.id
              return (
                <li key={store.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(store.id)}
                    aria-pressed={active}
                    className={`group w-full text-left border p-6 transition-colors ${
                      active
                        ? "border-neutral-950 bg-neutral-50"
                        : "border-neutral-200 hover:border-neutral-950"
                    }`}
                  >
                    <span className="flex items-start gap-x-3">
                      <MapPin
                        aria-hidden="true"
                        className={`w-4 h-4 mt-[2px] shrink-0 transition-colors ${
                          active ? "text-neutral-950" : "text-neutral-400"
                        }`}
                      />
                      <span className="block flex-1">
                        <span className="block text-[12px] font-bold uppercase tracking-[0.05em] text-neutral-950">
                          {store.name}
                        </span>

                        <span className="block mt-2 text-[12px] text-neutral-900 leading-[1.8]">
                          {store.addressLines.map((line) => (
                            <span key={line} className="block">
                              {line}
                            </span>
                          ))}
                          <span className="block">
                            {store.city}, {store.state} {store.postalCode}
                          </span>
                        </span>

                        <span className="flex items-center gap-x-2 mt-3 text-[12px] text-neutral-900">
                          <Clock
                            aria-hidden="true"
                            className="w-4 h-4 shrink-0 text-neutral-400"
                          />
                          {store.hours ?? (
                            <mark className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5">
                              [TO BE COMPLETED: opening hours]
                            </mark>
                          )}
                        </span>

                        <span className="flex flex-wrap gap-1.5 mt-4">
                          {store.sections.map((section) => (
                            <span
                              key={section}
                              className="inline-block border border-neutral-300 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-neutral-600"
                            >
                              {section}
                            </span>
                          ))}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="px-4 md:px-8 lg:px-0">
        {selected ? (
          <div className="flex flex-col">
            <iframe
              key={selected.id}
              title={`Map showing ${selected.name}`}
              src={mapSrc(selected)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-[60vh] min-h-[420px] lg:h-[calc(100vh-220px)] lg:min-h-[560px] border-0"
            />
            <div className="flex flex-col sm:flex-row gap-3 mt-5 lg:px-10">
              <a
                href={directionsHref(selected)}
                target="_blank"
                rel="noreferrer"
                className={actionClass}
              >
                <Navigation aria-hidden="true" className="w-4 h-4" />
                Get directions
              </a>
              <a
                href={`tel:${selected.phone.replace(/\s/g, "")}`}
                className={actionClass}
              >
                <Phone aria-hidden="true" className="w-4 h-4" />
                {selected.phone}
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
