"use client"

import Image from "next/image"
import { getProductPrice } from "@lib/util/get-product-price"
import { ProductCard } from "@lib/util/product-cards"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishlistButton from "@modules/common/components/wishlist-button"
import PreviewPrice from "../product-preview/price"
import PanelShell from "../panel-shell"

/**
 * "Look items": every product worn in the photos, as curated in admin.
 *
 * Sized to the Mango reference (measured from its dialog): a 416px panel with
 * 32px side padding, so the list is 350px -- two flush 175px columns. Each tile
 * is a 175x249 photo, a name row with the heart, and the price; one row of
 * tiles measures 332px: 249 photo + 67 text block + the list's 16px bottom padding.
 */
export default function LookPanel({
  items,
  onClose,
}: {
  items: ProductCard[]
  onClose: () => void
}) {
  return (
    <PanelShell title="Look items" onClose={onClose} maxWidth="416px" bodyClassName="px-8">
      <ul className="grid w-full max-w-[350px] grid-cols-2 gap-y-4 pb-4">
        {items.map(({ card, product }) => {
          const { variantPrice, cheapestPrice } = getProductPrice({
            product,
            variantId: card.variantId,
          })
          const price = variantPrice ?? cheapestPrice

          return (
            <li key={card.key} className="flex min-w-0 flex-col pb-[17px]">
              <LocalizedClientLink
                href={card.href}
                className="relative block aspect-[175/249] w-full overflow-hidden bg-neutral-100"
              >
                {card.thumbnail ? (
                  <Image
                    src={card.thumbnail}
                    alt={card.label ? `${product.title} (${card.label})` : product.title ?? ""}
                    fill
                    sizes="175px"
                    className="object-cover object-center"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[12px] text-neutral-400">
                    NO IMAGE
                  </span>
                )}
              </LocalizedClientLink>

              <div className="flex h-[20px] items-center justify-between gap-x-1 pl-2 pr-1 mt-2">
                <LocalizedClientLink
                  href={card.href}
                  className="min-w-0 truncate text-[12px] leading-[20px] text-neutral-900 hover:text-neutral-500 transition-colors"
                  title={product.title}
                >
                  {product.title}
                </LocalizedClientLink>
                <WishlistButton
                  product={product}
                  card={card}
                  className="shrink-0 !p-0.5 text-neutral-900"
                  iconClassName="w-4 h-4"
                />
              </div>

              {price && (
                <div className="mt-0.5 flex h-[20px] items-center pl-2 text-[12px] leading-[20px]">
                  <PreviewPrice price={price} isMobileLayout />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </PanelShell>
  )
}
