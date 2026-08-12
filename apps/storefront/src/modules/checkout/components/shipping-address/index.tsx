import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { clx } from "@medusajs/ui"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import { useAddressLocations } from "@modules/checkout/hooks/use-address-locations"
import Select from "react-select"
import { formSelectStyles } from "@modules/common/components/select-styles"

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  const [stateFocused, setStateFocused] = useState(false)
  const [cityFocused, setCityFocused] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || "",
  })

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // Fetched from /api/locations rather than bundled -- see the hook.
  const { stateOptions, cityOptions } = useAddressLocations(
    formData["shipping_address.country_code"],
    formData["shipping_address.province"]
  )

  // check if customer has saved addresses that are in the current region
  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    if (address) {
      setFormData((prevState: Record<string, string>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))
    }

    if (email) {
      setFormData((prevState: Record<string, string>) => ({
        ...prevState,
        email: email,
      }))
    }
  }

  useEffect(() => {
    // Ensure cart is not null and has a shipping_address before setting form data
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart]) // Add cart as a dependency

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-3 border border-neutral-200 px-5 py-5 shadow-none rounded-none">
          <p className="text-sm text-neutral-600">
            {`Hi ${customer.first_name}, do you want to use one of your saved addresses?`}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as unknown as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}
      <div className="grid grid-cols-1 gap-y-4">
        <Input
          label="Name"
          name="shipping_address.first_name"
          autoComplete="given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-first-name-input"
        />
        <Input
          label="Surname"
          name="shipping_address.last_name"
          autoComplete="family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-last-name-input"
        />
        <Input
          label="E-mail"
          name="email"
          type="email"
          title="Enter a valid email address."
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
        {/* Mobile with a +91 country-code prefix, matching the MANGO checkout */}
        <div className="relative flex h-12 w-full border border-neutral-300 transition-colors focus-within:border-neutral-950">
          <div className="flex items-center gap-x-1 border-r border-neutral-300 pl-4 pr-3 text-[12px] lg:text-[14px] text-neutral-900">
            <span>+91</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-3.5 w-3.5 text-neutral-500"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <div className="relative z-0 flex-1">
            <input
              id="shipping_address.phone"
              name="shipping_address.phone"
              autoComplete="tel"
              inputMode="numeric"
              placeholder=" "
              value={formData["shipping_address.phone"]}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  // The +91 shown to the left is decorative; keep only the
                  // 10-digit number. Autofill often injects "+91…"/spaces, which
                  // would otherwise submit as an invalid 12-digit phone.
                  "shipping_address.phone": e.target.value
                    .replace(/\D/g, "")
                    .slice(-10),
                })
              }
              data-testid="shipping-phone-input"
              className="peer block h-full w-full appearance-none rounded-none bg-transparent px-4 pt-[22px] pb-[6px] text-[12px] lg:text-[14px] leading-none focus:outline-none focus:ring-0"
            />
            <label
              htmlFor="shipping_address.phone"
              data-no-global-float
              className="pointer-events-none absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none text-black transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[12px] lg:text-[14px] peer-focus:top-[7px] peer-focus:translate-y-0 peer-focus:text-[12px] lg:text-[14px]"
            >
              Mobile
            </label>
          </div>
        </div>
        <div className="relative w-full">
          <label className="pointer-events-none absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none text-black">
            Country
            <span className="ml-1 text-rose-500">*</span>
          </label>
          <CountrySelect
            name="shipping_address.country_code"
            autoComplete="country"
            region={cart?.region}
            value={formData["shipping_address.country_code"]}
            onChange={handleChange}
            required
            data-testid="shipping-country-select"
            placeholder=""
          />
        </div>
        <Input
          label="Address"
          name="shipping_address.address_1"
          autoComplete="address-line1"
          value={formData["shipping_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="shipping-address-input"
        />
        <Input
          label="Postcode"
          name="shipping_address.postal_code"
          autoComplete="postal-code"
          value={formData["shipping_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-postal-code-input"
        />
        {/* State/Province is not shown in MANGO's design but is kept here so
            Shiprocket receives a non-null province/city on the order. */}
        <div className="relative flex flex-col gap-1">
          <Select
            options={stateOptions}
            value={formData["shipping_address.province"] ? { value: formData["shipping_address.province"], label: formData["shipping_address.province"] } : null}
            onChange={(selectedOption: any) => {
              setFormData({
                ...formData,
                "shipping_address.province": selectedOption?.value || "",
                "shipping_address.city": ""
              })
            }}
            onFocus={() => setStateFocused(true)}
            onBlur={() => setStateFocused(false)}
            isDisabled={!formData["shipping_address.country_code"]}
            placeholder=""
            className="text-[12px] lg:text-[14px]"
            styles={formSelectStyles}
          />
          <label className={clx(
            "pointer-events-none absolute left-4 z-10 leading-none transition-all duration-300 ease-in-out text-black",
            (stateFocused || formData["shipping_address.province"]) 
              ? "top-[7px] text-[12px] lg:text-[14px]" 
              : "top-1/2 -translate-y-1/2 text-[12px]"
          )}>State / Province</label>
        </div>
        <div className="relative flex flex-col gap-1">
          <Select
            options={formData["shipping_address.province"] ? cityOptions : []}
            value={formData["shipping_address.city"] ? { value: formData["shipping_address.city"], label: formData["shipping_address.city"] } : null}
            onChange={(selectedOption: any) => {
              handleChange({ target: { name: "shipping_address.city", value: selectedOption?.value || "" } } as any)
            }}
            onFocus={() => setCityFocused(true)}
            onBlur={() => setCityFocused(false)}
            isDisabled={!formData["shipping_address.province"]}
            placeholder=""
            className="text-[12px] lg:text-[14px]"
            styles={formSelectStyles}
          />
          <label className={clx(
            "pointer-events-none absolute left-4 z-10 leading-none transition-all duration-300 ease-in-out text-black",
            (cityFocused || formData["shipping_address.city"]) 
              ? "top-[7px] text-[12px] lg:text-[14px]" 
              : "top-1/2 -translate-y-1/2 text-[12px]"
          )}>Town / City</label>
        </div>
      </div>
      {/* react-select renders no native <input>, so the checkout's FormData
          submission silently drops State/City. These hidden inputs carry the
          selected values through so province/city are actually saved — without
          them orders arrive with null city/state and Shiprocket rejects them. */}
      <input
        type="hidden"
        name="shipping_address.province"
        value={formData["shipping_address.province"] || ""}
      />
      <input
        type="hidden"
        name="shipping_address.city"
        value={formData["shipping_address.city"] || ""}
      />
      <div className="my-6 border-t border-neutral-200 pt-5 hidden">
        <Checkbox
          label="Billing address same as shipping address"
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          data-testid="billing-address-checkbox"
        />
      </div>
    </>
  )
}

export default ShippingAddress
