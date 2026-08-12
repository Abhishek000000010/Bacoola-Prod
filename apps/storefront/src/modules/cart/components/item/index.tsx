"use client"

import { Table, Text, clx } from "@modules/common/components/ui"
import { updateLineItem, deleteLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useCartUndo } from "@modules/cart/components/undo-toast"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const undo = useCartUndo()

  const removeItem = async () => {
    setDeleting(true)
    const variantId = item.variant_id
    const quantity = item.quantity
    await deleteLineItem(item.id)
      .then(() => {
        if (variantId) {
          undo?.notifyDeleted({ variantId, quantity })
        }
      })
      .catch(() => setDeleting(false))
  }

  // Variant title tends to read like "L / White" or "White / L"
  const rawLabels = (item.variant?.title ?? "").split(" / ")
  let sizeLabel = rawLabels[0]
  let colorLabel = rawLabels.length > 1 ? rawLabels.slice(1).join(" / ") : ""

  // Heuristic: If the first label is longer than the second, it's probably the color, so swap them.
  if (rawLabels.length === 2 && rawLabels[0].length > rawLabels[1].length) {
    sizeLabel = rawLabels[1]
    colorLabel = rawLabels[0]
  }

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  // `inventory_quantity` is absent from the raw cart response and is filled in
  // by retrieveCartWithInventory (which the cart and checkout pages use in
  // place of retrieveCart). If it is still missing the stock is genuinely
  // unknown, so
  // hold the line at the current quantity rather than assuming a default --
  // guessing high is what allowed 10 of a 6-stock variant into the cart.
  const stock = item.variant?.inventory_quantity
  const managed = item.variant?.manage_inventory

  const maxQuantity = !managed
    ? 100
    : typeof stock === "number"
    ? stock
    : item.quantity

  const atMax = item.quantity >= maxQuantity

  if (type === "preview") {
    return (
      <div className="flex gap-x-4 py-5 border-b border-neutral-200/60 last:border-b-0 w-full" data-testid="product-row">
        <LocalizedClientLink href={`/products/${item.product_handle}`} className="shrink-0 w-[97px] h-[136px] bg-neutral-100 relative overflow-hidden">
          <Thumbnail thumbnail={item.thumbnail} images={item.variant?.product?.images} size="full" className="object-cover absolute inset-0 w-full h-full" />
        </LocalizedClientLink>
        <div className="flex flex-col flex-1 text-xs lg:text-sm text-neutral-800 justify-between">
          <div className="flex justify-between items-start gap-x-2">
            <div className="flex flex-col pr-2">
              <LocalizedClientLink href={`/products/${item.product_handle}`}>
                <Text className="text-sm font-normal text-neutral-900 leading-tight mb-2 hover:text-black" data-testid="product-title">{item.product_title}</Text>
              </LocalizedClientLink>
              <div className="text-neutral-600 flex flex-col gap-y-0.5 text-xs lg:text-sm">
                <div>Quantity: <span className="text-neutral-900">{item.quantity}</span></div>
                <LineItemOptions variant={item.variant} data-testid="product-variant" />
              </div>
            </div>
            <div className="text-right text-sm font-medium text-neutral-900 shrink-0">
              <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
            </div>
          </div>
          <div className="pt-2">
            <DeleteButton id={item.id} data-testid="product-delete-button" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="product-row">
    {/* ------------------------------------------------------------------ */}
    {/* PHONE layout: image on the left, details on the right (Mango-style). */}
    {/* Desktop keeps the stacked card below (hidden lg:flex).              */}
    {/* ------------------------------------------------------------------ */}
    <div className="flex lg:hidden w-full gap-x-4">
      <LocalizedClientLink
        href={`/products/${item.product_handle}`}
        className="shrink-0 w-[120px] aspect-[3/4] bg-neutral-100 relative overflow-hidden"
      >
        <Thumbnail
          thumbnail={item.thumbnail}
          images={item.variant?.product?.images}
          size="full"
          className="object-cover absolute inset-0 w-full h-full"
        />
      </LocalizedClientLink>

      <div className="flex flex-1 flex-col min-w-0 justify-between py-0.5">
        {/* Wishlist + remove, top-right */}
        <div className="flex items-center justify-end gap-x-2">
          <button
            aria-label="Add to wishlist"
            className="text-neutral-400 hover:text-black transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
          <button
            onClick={removeItem}
            disabled={deleting}
            aria-label="Remove item"
            className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-600 hover:text-black transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Spinner />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>

        <LocalizedClientLink href={`/products/${item.product_handle}`}>
          <Text className="text-[13px] font-normal text-neutral-900 leading-snug line-clamp-1">
            {item.product_title}
          </Text>
        </LocalizedClientLink>

        <div className="text-[13px] font-normal text-neutral-900">
          <LineItemPrice item={item} style="tight" currencyCode={currencyCode} align="left" />
        </div>

        {/* Quantity stepper */}
        <div className="flex items-center gap-x-4 text-[13px] text-neutral-900">
          <button
            className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30"
            onClick={() => changeQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1 || updating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <span className="font-semibold">{item.quantity}</span>
          <button
            className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30"
            onClick={() => changeQuantity(item.quantity + 1)}
            disabled={item.quantity >= maxQuantity || updating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          {updating && <Spinner />}
        </div>

        {/* Size / colour */}
        <div className="flex items-center gap-x-4 text-[13px] text-neutral-900">
          {sizeLabel && (
            <span className="flex items-center gap-x-1.5 font-semibold">
              {sizeLabel}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-3.5 h-3.5 text-neutral-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          )}
          {colorLabel && <span className="text-neutral-700">{colorLabel}</span>}
        </div>

        <ErrorMessage error={error} />
      </div>
    </div>

    {/* ------------------------------------------------------------------ */}
    {/* DESKTOP layout (unchanged): stacked card.                          */}
    {/* ------------------------------------------------------------------ */}
    <div className="hidden lg:flex flex-col w-full">
      {/* Product image with close button overlaid at the top-right */}
      <div className="relative w-full aspect-[3/4] bg-neutral-100 overflow-hidden">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="block w-full h-full"
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="full"
            className="object-cover absolute inset-0 w-full h-full"
          />
        </LocalizedClientLink>
        <button
          onClick={removeItem}
          disabled={deleting}
          aria-label="Remove item"
          data-testid="product-delete-button"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 border border-neutral-200 text-neutral-700 hover:text-black transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Spinner />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      </div>

      {/* Title + wishlist */}
      <div className="mt-2 pl-2 flex items-start justify-between gap-x-2">
        <LocalizedClientLink href={`/products/${item.product_handle}`}>
          <Text className="text-[12px] lg:text-[14px] font-normal text-neutral-900 leading-snug" data-testid="product-title">
            {item.product_title}
          </Text>
        </LocalizedClientLink>
        <button
          aria-label="Add to wishlist"
          className="shrink-0 text-neutral-400 hover:text-black transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>

      {/* Price */}
      <div className="mt-1 pl-2 text-[12px] lg:text-[14px] font-normal text-neutral-900">
        <LineItemPrice item={item} style="tight" currencyCode={currencyCode} align="left" />
      </div>

      {/* Quantity stepper + variant (size / colour) */}
      <div className="mt-3 pl-2 flex items-center text-[12px] lg:text-[14px] text-neutral-900">
        <div className="flex items-center gap-x-4 mr-6">
          <button
            className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30"
            onClick={() => changeQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1 || updating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>
          <span className="font-semibold">{item.quantity}</span>
          <button
            className="w-5 h-5 flex items-center justify-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30"
            onClick={() => changeQuantity(item.quantity + 1)}
            disabled={item.quantity >= maxQuantity || updating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          {updating && <Spinner />}
        </div>

        {sizeLabel && (
          <span className="flex items-center gap-x-1.5 font-semibold mr-6" data-testid="product-variant">
            {sizeLabel}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-3.5 h-3.5 text-neutral-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </span>
        )}
        {colorLabel && <span className="text-neutral-700">{colorLabel}</span>}
      </div>

      <div className="mt-2">
        <ErrorMessage error={error} data-testid="product-error-message" />
      </div>
    </div>
    </div>
  )
}

export default Item
