import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import Input from "@modules/common/components/input"
import React, { useState } from "react"
import CountrySelect from "../country-select"
import { useAddressLocations } from "@modules/checkout/hooks/use-address-locations"
import Select from "react-select"
import { formSelectStyles } from "@modules/common/components/select-styles"

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  const [stateFocused, setStateFocused] = useState(false)
  const [cityFocused, setCityFocused] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.country_code": cart?.billing_address?.country_code || "",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
  })

  // Fetched from /api/locations rather than bundled -- see the hook.
  const { stateOptions, cityOptions } = useAddressLocations(
    formData["billing_address.country_code"],
    formData["billing_address.province"]
  )

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
      <div className="mb-4 grid grid-cols-1 gap-y-6">
        <Input
          label="First name"
          name="billing_address.first_name"
          autoComplete="given-name"
          value={formData["billing_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="billing-first-name-input"
        />
        <Input
          label="Last name"
          name="billing_address.last_name"
          autoComplete="family-name"
          value={formData["billing_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="billing-last-name-input"
        />
        <Input
          label="Address"
          name="billing_address.address_1"
          autoComplete="address-line1"
          value={formData["billing_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="billing-address-input"
        />
        <Input
          label="Company"
          name="billing_address.company"
          value={formData["billing_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="billing-company-input"
        />
        <Input
          label="Postal code"
          name="billing_address.postal_code"
          autoComplete="postal-code"
          value={formData["billing_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="billing-postal-input"
        />
        <div className="relative w-full">
          <label className="pointer-events-none absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none text-black">
            Country
            <span className="ml-1 text-rose-500">*</span>
          </label>
          <CountrySelect
            name="billing_address.country_code"
            autoComplete="country"
            region={cart?.region}
            value={formData["billing_address.country_code"]}
            onChange={handleChange}
            required
            data-testid="billing-country-select"
            placeholder=""
          />
        </div>
        <div className="relative flex flex-col gap-1">
          <Select
            options={stateOptions}
            value={formData["billing_address.province"] ? { value: formData["billing_address.province"], label: formData["billing_address.province"] } : null}
            onChange={(selectedOption: any) => {
              setFormData({
                ...formData,
                "billing_address.province": selectedOption?.value || "",
                "billing_address.city": "" // Reset city when state changes
              })
            }}
            onFocus={() => setStateFocused(true)}
            onBlur={() => setStateFocused(false)}
            isDisabled={!formData["billing_address.country_code"]}
            placeholder=""
            className="text-[12px] lg:text-[14px]"
            styles={formSelectStyles}
          />
          <label className={clx(
            "pointer-events-none absolute left-4 z-10 leading-none transition-all duration-300 ease-in-out text-black",
            (stateFocused || formData["billing_address.province"]) 
              ? "top-[7px] text-[12px] lg:text-[14px]" 
              : "top-1/2 -translate-y-1/2 text-[12px]"
          )}>State / Province</label>
        </div>
        <div className="relative flex flex-col gap-1">
          <Select
            options={formData["billing_address.province"] ? cityOptions : []}
            value={formData["billing_address.city"] ? { value: formData["billing_address.city"], label: formData["billing_address.city"] } : null}
            onChange={(selectedOption: any) => {
              handleChange({ target: { name: "billing_address.city", value: selectedOption?.value || "" } } as any)
            }}
            onFocus={() => setCityFocused(true)}
            onBlur={() => setCityFocused(false)}
            isDisabled={!formData["billing_address.province"]}
            placeholder=""
            className="text-[12px] lg:text-[14px]"
            styles={formSelectStyles}
          />
          <label className={clx(
            "pointer-events-none absolute left-4 z-10 leading-none transition-all duration-300 ease-in-out text-black",
            (cityFocused || formData["billing_address.city"]) 
              ? "top-[7px] text-[12px] lg:text-[14px]" 
              : "top-1/2 -translate-y-1/2 text-[12px]"
          )}>Town / City</label>
        </div>
        {/* Hidden inputs so the react-select State/City values reach FormData
            (same fix as the shipping address form). */}
        <input
          type="hidden"
          name="billing_address.province"
          value={formData["billing_address.province"] || ""}
        />
        <input
          type="hidden"
          name="billing_address.city"
          value={formData["billing_address.city"] || ""}
        />
        <Input
          label="Phone"
          name="billing_address.phone"
          autoComplete="tel"
          value={formData["billing_address.phone"]}
          onChange={handleChange}
          data-testid="billing-phone-input"
        />
      </div>
    </>
  )
}

export default BillingAddress
