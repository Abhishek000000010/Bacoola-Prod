"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const itemRef = useRef<number>(totalItems || 0)

  // The panel announces one add, so it shows the most recently added line only
  // -- the full basket lives on /cart.
  const lastItem = cartState?.items
    ?.slice()
    .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))[0]

  // Size first, then colour, then anything else -- whatever order the product
  // happened to define its options in.
  const optionRank = (title?: string) => {
    const t = title?.toLowerCase() ?? ""
    if (t.startsWith("size")) return 0
    if (t.startsWith("colo")) return 1
    return 2
  }
  const lastItemOptions = (lastItem?.variant?.options ?? [])
    .slice()
    .sort((a, b) => optionRank(a.option?.title) - optionRank(b.option?.title))

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()



  // open cart dropdown when totalItems changes, and sync itemRef
  useEffect(() => {
    if (itemRef.current !== totalItems) {
      if (itemRef.current < totalItems && !pathname.includes("/cart")) {
        timedOpen()
      }
      itemRef.current = totalItems
    }
  }, [totalItems, pathname])

  return (
    // No hover-to-open: this panel announces an add, so it should only appear
    // when something was actually added.
    <div className="h-full z-50">
      <Popover className="relative h-full">
        <PopoverButton className="h-full focus:outline-none">
          <LocalizedClientLink
            className="hover:opacity-70 transition-opacity duration-200 flex items-center"
            href="/cart"
            data-testid="nav-cart-link"
          >
            <span className="nav-underline hidden small:block text-[12px] leading-none font-semibold uppercase tracking-wider text-[#111111]">
              {`Bag (${totalItems})`}
            </span>
            <div className="small:hidden relative flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] text-[#111111]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[12px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {totalItems}
                </span>
              )}
            </div>
          </LocalizedClientLink>
        </PopoverButton>
        {/* Slides in from the right edge rather than popping open, matching the
            product-page panels. Overflow on the wrapper is what keeps the card
            hidden off-screen while it travels. */}
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition-transform duration-[420ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]"
          enterFrom="translate-x-[calc(100%+40px)]"
          enterTo="translate-x-0"
          leave="transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-[calc(100%+40px)]"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+8px)] right-0 w-[600px] bg-white border border-neutral-200 shadow-[0_8px_32px_rgba(0,0,0,0.10)] text-ui-fg-base z-[100]"
            data-testid="nav-cart-dropdown"
          >
            <div className="flex items-start justify-between px-6 pt-6">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-900">
                Added to your shopping bag
              </h3>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 text-neutral-900 transition-colors hover:text-neutral-500"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth="1.5" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {lastItem ? (
              <>
                <div className="flex gap-x-6 px-6 pt-6">
                  <LocalizedClientLink
                    href={`/products/${lastItem.product_handle}`}
                    onClick={close}
                    className="w-[110px] shrink-0"
                  >
                    <Thumbnail
                      thumbnail={lastItem.thumbnail}
                      images={lastItem.variant?.product?.images}
                      size="full"
                    />
                  </LocalizedClientLink>

                  <div className="flex flex-col pt-1">
                    <LocalizedClientLink
                      href={`/products/${lastItem.product_handle}`}
                      onClick={close}
                      data-testid="product-link"
                      className="text-[12px] text-neutral-900"
                    >
                      {lastItem.title}
                    </LocalizedClientLink>

                    <span className="mt-2 text-[12px] text-neutral-900" data-testid="cart-item-price">
                      {convertToLocale({
                        amount: lastItem.unit_price ?? 0,
                        currency_code: cartState?.currency_code ?? "inr",
                      })}
                    </span>

                    {/* Size, then colour. */}
                    <div className="mt-4 flex gap-x-5 text-[12px] text-neutral-900" data-testid="cart-item-variant">
                      {lastItemOptions.map((option) => (
                        <span key={option.id}>{option.value}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-x-[2px] px-6 pb-6 pt-8">
                  <LocalizedClientLink
                    href="/checkout"
                    onClick={close}
                    className="flex-1 border border-neutral-900 py-3.5 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-900 transition-colors hover:border-neutral-400 hover:text-neutral-400"
                  >
                    Checkout
                  </LocalizedClientLink>
                  <LocalizedClientLink
                    href="/cart"
                    onClick={close}
                    data-testid="go-to-cart-button"
                    className="flex-1 border border-neutral-900 bg-neutral-900 py-3.5 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-white hover:text-neutral-900"
                  >
                    {`View bag (${totalItems})`}
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <p className="px-6 pb-6 pt-4 text-[12px] text-neutral-500">
                Your shopping bag is empty.
              </p>
            )}
          </PopoverPanel>
        </Transition>

        {/* Mobile: the same announcement, but as a sheet that slides up from the
            bottom of the screen. Desktop keeps the right-hand panel above. */}
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
          enterFrom="translate-y-full"
          enterTo="translate-y-0"
          leave="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          leaveFrom="translate-y-0"
          leaveTo="translate-y-full"
        >
          <PopoverPanel
            static
            className="small:hidden fixed inset-x-0 bottom-0 z-[100] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] text-ui-fg-base"
            data-testid="nav-cart-dropdown-mobile"
          >
            <div className="flex items-start justify-between px-5 pt-6">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-900">
                Added to your shopping bag
              </h3>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 text-neutral-900 transition-colors hover:text-neutral-500"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth="1.5" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {lastItem ? (
              <>
                <div className="flex gap-x-4 px-5 pt-5">
                  <LocalizedClientLink
                    href={`/products/${lastItem.product_handle}`}
                    onClick={close}
                    className="w-[92px] shrink-0"
                  >
                    <Thumbnail
                      thumbnail={lastItem.thumbnail}
                      images={lastItem.variant?.product?.images}
                      size="full"
                    />
                  </LocalizedClientLink>

                  <div className="flex flex-col pt-1">
                    <LocalizedClientLink
                      href={`/products/${lastItem.product_handle}`}
                      onClick={close}
                      className="text-[12px] text-neutral-900"
                    >
                      {lastItem.title}
                    </LocalizedClientLink>

                    <span className="mt-2 text-[12px] text-neutral-900">
                      {convertToLocale({
                        amount: lastItem.unit_price ?? 0,
                        currency_code: cartState?.currency_code ?? "inr",
                      })}
                    </span>

                    <div className="mt-3 flex gap-x-5 text-[12px] text-neutral-900">
                      {lastItemOptions.map((option) => (
                        <span key={option.id}>{option.value}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-y-[2px] px-5 pb-6 pt-6">
                  <LocalizedClientLink
                    href="/cart"
                    onClick={close}
                    className="w-full bg-neutral-900 py-3.5 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-black"
                  >
                    {`View bag (${totalItems})`}
                  </LocalizedClientLink>
                  <LocalizedClientLink
                    href="/checkout"
                    onClick={close}
                    className="w-full border border-neutral-900 py-3.5 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-neutral-900 transition-colors hover:border-neutral-400 hover:text-neutral-400"
                  >
                    Checkout
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <p className="px-5 pb-6 pt-4 text-[12px] text-neutral-500">
                Your shopping bag is empty.
              </p>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
