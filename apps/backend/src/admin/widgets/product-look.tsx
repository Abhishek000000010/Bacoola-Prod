// @ts-nocheck
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Input, Text, toast } from "@medusajs/ui"
import { useEffect, useMemo, useRef, useState } from "react"
import { sdk } from "../lib/config"

/**
 * "See look" editor: which products are worn in this product's photos.
 *
 * Stored as `product.metadata.look`:
 *   { default: LookItem[], colours: { [colour]: LookItem[] } }
 * where LookItem = { product_id, variant_id? }. `variant_id` is any variant of
 * the chosen colourway of the LINKED product (size doesn't matter), so the
 * storefront shows and opens the right colour.
 *
 * Looks are per colour because the photos are (see variant-image-order.tsx);
 * "All colours" is the fallback for colours without their own look. When every
 * list is empty the key is cleared and the storefront hides SEE LOOK.
 *
 * MUST stay in sync with apps/storefront/src/lib/util/look.ts.
 */

const DEFAULT_SCOPE = "__default__"

const isColourOption = (option: any): boolean =>
  /^colou?rs?$/i.test((option?.title ?? "").trim())

type LookItem = { product_id: string; variant_id?: string }
type Look = { default: LookItem[]; colours: Record<string, LookItem[]> }

type LinkedProduct = {
  id: string
  title: string
  thumbnail?: string | null
  /** Colour value -> first variant of that colour, plus a thumbnail if one is set. */
  colours: { value: string; variantId: string; thumbnail?: string | null }[]
}

const LINKED_FIELDS =
  "id,title,thumbnail,options.id,options.title," +
  "variants.id,variants.metadata,variants.options.option_id,variants.options.value"

const toLinked = (p: any): LinkedProduct => {
  const colourOption = (p.options ?? []).find(isColourOption)
  const colours: LinkedProduct["colours"] = []
  if (colourOption) {
    const seen = new Set<string>()
    for (const v of p.variants ?? []) {
      const value = (v.options ?? []).find((o: any) => o.option_id === colourOption.id)?.value
      if (!value || seen.has(value)) continue
      seen.add(value)
      const thumb = v.metadata?.thumbnail
      colours.push({ value, variantId: v.id, thumbnail: typeof thumb === "string" ? thumb : null })
    }
  }
  return { id: p.id, title: p.title, thumbnail: p.thumbnail, colours }
}

const parseLook = (raw: any): Look => {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = null
    }
  }
  const items = (list: any): LookItem[] =>
    Array.isArray(list)
      ? list
          .filter((i) => i && typeof i.product_id === "string")
          .map((i) => ({ product_id: i.product_id, variant_id: i.variant_id || undefined }))
      : []
  const colours: Record<string, LookItem[]> = {}
  for (const [k, v] of Object.entries(raw?.colours ?? {})) {
    const list = items(v)
    if (list.length) colours[k] = list
  }
  return { default: items(raw?.default), colours }
}

const sameItem = (a: LookItem, b: LookItem) =>
  a.product_id === b.product_id && (a.variant_id ?? "") === (b.variant_id ?? "")

const ProductLook = ({ data }: { data: { id: string } }) => {
  const productId = data?.id

  const [metadata, setMetadata] = useState<Record<string, any>>({})
  const [colourValues, setColourValues] = useState<string[]>([])
  const [look, setLook] = useState<Look>({ default: [], colours: {} })
  const [savedJson, setSavedJson] = useState("")
  const [scope, setScope] = useState(DEFAULT_SCOPE)
  const [linked, setLinked] = useState<Record<string, LinkedProduct>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LinkedProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [pickingColourFor, setPickingColourFor] = useState<string | null>(null)
  const searchSeq = useRef(0)

  const fetchLinked = async (ids: string[]) => {
    const missing = ids.filter((id) => !linked[id])
    if (!missing.length) return
    const res: any = await sdk.client.fetch(`/admin/products`, {
      query: { id: missing, fields: LINKED_FIELDS, limit: missing.length },
    })
    setLinked((prev) => {
      const next = { ...prev }
      for (const p of res?.products ?? []) next[p.id] = toLinked(p)
      return next
    })
  }

  const load = async () => {
    setLoading(true)
    try {
      const res: any = await sdk.client.fetch(`/admin/products/${productId}`, {
        query: {
          fields:
            "id,metadata,options.id,options.title," +
            "variants.options.option_id,variants.options.value",
        },
      })
      const product = res?.product ?? {}
      setMetadata(product.metadata ?? {})

      const colourOption = (product.options ?? []).find(isColourOption)
      const values: string[] = []
      if (colourOption) {
        for (const v of product.variants ?? []) {
          const value = (v.options ?? []).find((o: any) => o.option_id === colourOption.id)?.value
          if (value && !values.includes(value)) values.push(value)
        }
      }
      setColourValues(values)

      const parsed = parseLook(product.metadata?.look)
      setLook(parsed)
      setSavedJson(JSON.stringify(parsed))

      const ids = [
        ...new Set([parsed.default, ...Object.values(parsed.colours)].flat().map((i) => i.product_id)),
      ]
      if (ids.length) await fetchLinked(ids)
    } catch (e: any) {
      toast.error("Could not load look", { description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (productId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  // Debounced product search.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const seq = ++searchSeq.current
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res: any = await sdk.client.fetch(`/admin/products`, {
          query: { q, fields: LINKED_FIELDS, limit: 10 },
        })
        if (seq !== searchSeq.current) return
        const found = (res?.products ?? []).map(toLinked)
        setResults(found)
        setLinked((prev) => {
          const next = { ...prev }
          for (const p of found) next[p.id] = p
          return next
        })
      } catch (e: any) {
        toast.error("Search failed", { description: e?.message })
      } finally {
        if (seq === searchSeq.current) setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const items: LookItem[] =
    scope === DEFAULT_SCOPE ? look.default : look.colours[scope] ?? []

  const setItems = (next: LookItem[]) =>
    setLook((prev) =>
      scope === DEFAULT_SCOPE
        ? { ...prev, default: next }
        : { ...prev, colours: { ...prev.colours, [scope]: next } }
    )

  const addItem = (item: LookItem) => {
    if (items.some((i) => sameItem(i, item))) {
      toast.info("Already in this look")
      return
    }
    setItems([...items, item])
    setPickingColourFor(null)
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    setItems(next)
  }

  const normalised = useMemo(() => {
    const colours: Record<string, LookItem[]> = {}
    for (const [k, v] of Object.entries(look.colours)) if (v.length) colours[k] = v
    return { default: look.default, colours }
  }, [look])

  const isDirty = JSON.stringify(normalised) !== savedJson
  const isEmpty = !normalised.default.length && !Object.keys(normalised.colours).length

  const onSave = async () => {
    setSaving(true)
    try {
      await sdk.client.fetch(`/admin/products/${productId}`, {
        method: "POST",
        body: {
          // Spread existing metadata so unrelated keys survive the write.
          metadata: { ...metadata, look: isEmpty ? null : normalised },
        },
      })
      setMetadata((prev) => ({ ...prev, look: isEmpty ? null : normalised }))
      setSavedJson(JSON.stringify(normalised))
      toast.success(isEmpty ? "Look cleared — SEE LOOK is hidden" : "Look saved")
    } catch (e: any) {
      toast.error("Could not save look", { description: e?.message })
    } finally {
      setSaving(false)
    }
  }

  const describe = (item: LookItem) => {
    const p = linked[item.product_id]
    if (!p) return { title: "Product not found (deleted?)", colour: undefined, thumbnail: null, missing: true }
    const colour = item.variant_id
      ? p.colours.find((c) => c.variantId === item.variant_id)
      : undefined
    return {
      title: p.title,
      colour: colour?.value,
      thumbnail: colour?.thumbnail || p.thumbnail,
      missing: false,
    }
  }

  const countFor = (key: string) =>
    key === DEFAULT_SCOPE ? look.default.length : (look.colours[key] ?? []).length

  if (!productId) return null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">See look</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Products worn in this product's photos. Shoppers see them under SEE LOOK on the
            product page. Leave empty to hide the button.
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          {isDirty && (
            <Button
              variant="secondary"
              size="small"
              disabled={saving}
              onClick={() => setLook(JSON.parse(savedJson || '{"default":[],"colours":{}}'))}
            >
              Reset
            </Button>
          )}
          <Button size="small" disabled={!isDirty || saving || loading} onClick={onSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">Loading...</Text>
        </div>
      ) : (
        <>
          {/* Which look is being edited */}
          <div className="flex flex-wrap items-center gap-2 px-6 py-4">
            <Text size="small" weight="plus" className="mr-2">Look for</Text>
            {[DEFAULT_SCOPE, ...colourValues].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setScope(key)
                  setPickingColourFor(null)
                }}
                className={
                  "rounded-full border px-3 py-1 text-xs transition-fg " +
                  (scope === key
                    ? "border-ui-border-interactive bg-ui-bg-highlight text-ui-fg-base"
                    : "border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base")
                }
              >
                {key === DEFAULT_SCOPE ? "All colours" : key}{" "}
                <span className="text-ui-fg-muted">({countFor(key)})</span>
              </button>
            ))}
          </div>

          {/* Items in the selected look */}
          <div className="px-6 py-4">
            <Text size="small" className="mb-3 text-ui-fg-subtle">
              {scope === DEFAULT_SCOPE
                ? colourValues.length
                  ? "Used for every colour that doesn't have its own look."
                  : "Shown on this product's page."
                : items.length
                ? `Shown while "${scope}" is selected.`
                : `"${scope}" has no look of its own, so it uses All colours.`}
            </Text>

            {items.length === 0 ? (
              <Text size="small" className="text-ui-fg-muted">No products in this look yet.</Text>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((item, index) => {
                  const d = describe(item)
                  return (
                    <li
                      key={`${item.product_id}-${item.variant_id ?? ""}`}
                      className="flex items-center gap-3 rounded-lg border border-ui-border-base p-2"
                    >
                      <Badge size="2xsmall">{index + 1}</Badge>
                      <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-ui-bg-subtle">
                        {d.thumbnail && <img src={d.thumbnail} className="size-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Text size="small" weight="plus" className={"truncate " + (d.missing ? "text-ui-fg-error" : "")}>
                          {d.title}
                        </Text>
                        {d.colour && (
                          <Text size="xsmall" className="text-ui-fg-subtle">Colour: {d.colour}</Text>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="transparent" size="small" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Move up">↑</Button>
                        <Button variant="transparent" size="small" disabled={index === items.length - 1} onClick={() => move(index, index + 1)} aria-label="Move down">↓</Button>
                        <Button variant="transparent" size="small" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                          Remove
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Add a product */}
          <div className="px-6 py-4">
            <Text size="small" weight="plus" className="mb-2">
              Add a product{scope !== DEFAULT_SCOPE ? ` to the "${scope}" look` : ""}
            </Text>
            <Input
              size="small"
              type="search"
              placeholder="Search products by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {searching && (
              <Text size="small" className="mt-2 text-ui-fg-subtle">Searching...</Text>
            )}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <Text size="small" className="mt-2 text-ui-fg-subtle">No products found.</Text>
            )}

            {results.length > 0 && (
              <ul className="mt-2 flex flex-col divide-y rounded-lg border border-ui-border-base">
                {results.map((p) => {
                  const picking = pickingColourFor === p.id
                  return (
                    <li key={p.id} className="p-2">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-ui-bg-subtle">
                          {p.thumbnail && <img src={p.thumbnail} className="size-full object-cover" />}
                        </div>
                        <Text size="small" className="min-w-0 flex-1 truncate">{p.title}</Text>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() =>
                            p.colours.length > 1
                              ? setPickingColourFor(picking ? null : p.id)
                              : // One colour (or none): nothing to ask, add it as is.
                                addItem({ product_id: p.id, variant_id: p.colours[0]?.variantId })
                          }
                        >
                          {picking ? "Cancel" : "Add"}
                        </Button>
                      </div>
                      {picking && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
                          <Text size="xsmall" className="text-ui-fg-subtle">Which colour is in the photo?</Text>
                          {p.colours.map((c) => (
                            <Button
                              key={c.variantId}
                              variant="secondary"
                              size="small"
                              onClick={() => addItem({ product_id: p.id, variant_id: c.variantId })}
                            >
                              {c.value}
                            </Button>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductLook
