import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = ({ customer }: { customer?: HttpTypes.StoreCustomer | null }) => {
  return (
    <div
      className="py-16 px-4 lg:px-0 flex flex-col items-center text-center"
      data-testid="empty-cart-message"
    >
      <h1 className="text-base lg:text-lg font-semibold uppercase tracking-wider text-black mb-6">
        Your Shopping Bag is Empty
      </h1>

      {!customer && (
        <div className="w-full max-w-[300px] flex flex-col items-center gap-y-4">
          <span className="text-[12px] lg:text-[14px] text-neutral-900 font-medium">
            Enjoy a faster shopping experience
          </span>
          <LocalizedClientLink
            href="/account"
            className="w-full h-[42px] flex items-center justify-center bg-black text-white font-semibold text-xs lg:text-sm tracking-wider uppercase hover:bg-neutral-800 transition-colors"
          >
            Sign In
          </LocalizedClientLink>
          <span className="text-[12px] lg:text-[14px] text-neutral-600">
            Don&apos;t have an account?{" "}
            <LocalizedClientLink
              href="/account"
              className="font-semibold text-black underline underline-offset-4 hover:text-neutral-600 transition-colors"
            >
              Create account
            </LocalizedClientLink>
          </span>
        </div>
      )}
    </div>
  )
}

export default EmptyCartMessage
