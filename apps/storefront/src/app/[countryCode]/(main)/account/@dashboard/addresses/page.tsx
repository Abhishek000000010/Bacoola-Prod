import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

import InlineAddAddress from "@modules/account/components/address-card/inline-add-address"

export const metadata: Metadata = {
  title: "Addresses",
  description: "View and manage your saved delivery addresses.",
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const [customer, region] = await Promise.all([
    retrieveCustomer(),
    getRegion(countryCode),
  ])

  if (!customer || !region) {
    notFound()
  }

  const hasAddresses = customer.addresses && customer.addresses.length > 0

  return (
    <div className="w-full flex flex-col items-center pt-8 pb-20 font-sans text-[#111111]" data-testid="addresses-page-wrapper">
      <div className="w-full">
        
        {hasAddresses ? (
          <>
            <div className="mb-8 flex flex-col gap-y-4">
              <h1 className="text-2xl-semi">Shipping Addresses</h1>
              <p className="text-base-regular">
                View and update your shipping addresses, you can add as many as you
                like. Saving your addresses will make them available during checkout.
              </p>
            </div>
            <AddressBook customer={customer} region={region} />
          </>
        ) : (
          <div className="w-full flex flex-col items-center text-center">
            <h1 className="text-[15px] font-bold uppercase tracking-wider mb-4 text-[#111111]">
              MY ADDRESSES
            </h1>
            <p className="text-[12px] lg:text-[14px] font-normal mb-10 max-w-[420px] leading-relaxed text-[#111111]">
              You have still not saved any delivery address. Add one now and save time on your future purchases.
            </p>
            <InlineAddAddress region={region} customer={customer} />
          </div>
        )}

      </div>
    </div>
  )
}
