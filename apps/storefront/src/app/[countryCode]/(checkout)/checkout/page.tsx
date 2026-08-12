import { retrieveCartWithInventory } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import CheckoutSteps from "@modules/checkout/components/checkout-steps"
import CheckoutAuth from "@modules/checkout/templates/checkout-auth"
import MobileShoppingBag from "@modules/checkout/components/mobile-shopping-bag"
import MobileCheckoutSummary from "@modules/checkout/components/mobile-checkout-summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout(props: {
  searchParams: Promise<{ guest?: string }>
}) {
  const searchParams = await props.searchParams
  const [cart, customer] = await Promise.all([
    retrieveCartWithInventory(),
    retrieveCustomer(),
  ])

  if (!cart) {
    return notFound()
  }

  // Not signed in and not explicitly continuing as a guest: gate the checkout
  // behind the sign-in / create-account page.
  if (!customer && searchParams?.guest !== "1") {
    return <CheckoutAuth />
  }

  return (
    <div className="max-w-[1024px] w-full mx-auto px-4 pt-8 pb-16">
      {/* Step bar spans the full content width across the top */}
      <CheckoutSteps />

      {/* PaymentWrapper wraps both columns so the sidebar Pay-now button
          shares the Stripe Elements context with the card form.
          Fixed-width columns are pushed to the outer edges, leaving a
          large gap in the middle to match the MANGO checkout layout. */}
      <PaymentWrapper cart={cart}>
        <div className="mt-12 grid grid-cols-1 gap-y-12 lg:grid-cols-[587px_293px] lg:justify-between lg:gap-y-0">
          {/* Left Column */}
          <div className="flex flex-col w-full">
            <MobileShoppingBag cart={cart} />
            <CheckoutForm cart={cart} customer={customer} />
            {/* Phones have no side column: show the totals + Pay-now here,
                stuck to the bottom of the screen. Desktop uses the right
                column and is unaffected. */}
            <MobileCheckoutSummary cart={cart} />
          </div>

          {/* Right Column */}
          <div className="hidden lg:flex flex-col">
            <div className="sticky top-12">
              <CheckoutSummary cart={cart} />
            </div>
          </div>
        </div>
      </PaymentWrapper>
    </div>
  )
}
