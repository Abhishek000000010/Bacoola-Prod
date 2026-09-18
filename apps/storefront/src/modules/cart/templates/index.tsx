import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import Carousel from "../components/carousel"
import CartUndoProvider from "../components/undo-toast"

const CartTemplate = ({
  cart,
  customer,
  shippingOptions = [],
  recommendedProducts = [],
  region,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  shippingOptions?: HttpTypes.StoreCartShippingOption[]
  recommendedProducts?: HttpTypes.StoreProduct[]
  region?: HttpTypes.StoreRegion
}) => {
  return (
    <CartUndoProvider>
    <div className="pt-4 pb-12">
      <div className="w-full pl-0 pr-0 lg:pr-12" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-12 lg:gap-x-24">
            <div className="flex flex-col bg-white py-6 gap-y-6">
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12 mt-[44px]">
                {cart && cart.region && (
                  <div className="bg-white py-6 px-4 lg:px-0">
                    {!customer && (
                      <div className="mb-8 flex flex-col gap-y-2">
                        <span className="text-[12px] lg:text-[14px] text-neutral-900 font-medium">
                          Enjoy a faster shopping experience
                        </span>
                        <LocalizedClientLink
                          href="/account"
                          className="nav-underline w-fit text-[12px] lg:text-[14px] font-bold uppercase tracking-widest text-black"
                        >
                          SIGN IN
                        </LocalizedClientLink>
                      </div>
                    )}
                    <Summary cart={cart} shippingOptions={shippingOptions} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage customer={customer} />
          </div>
        )}
      </div>
      {recommendedProducts && recommendedProducts.length > 0 && region && (
        <Carousel products={recommendedProducts} region={region} />
      )}
    </div>
    </CartUndoProvider>
  )
}

export default CartTemplate
