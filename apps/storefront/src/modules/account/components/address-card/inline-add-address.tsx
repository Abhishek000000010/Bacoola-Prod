"use client"

import { useActionState, useEffect, useState } from "react"
import Select from "react-select"
import { addCustomerAddress } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import { useAddressLocations } from "@modules/checkout/hooks/use-address-locations"
import { formSelectStyles } from "@modules/common/components/select-styles"

// The read-only e-mail/country rows in this form show a small caption above
// their value; these fields animate their label into that same position instead
// of using a placeholder that disappears as soon as you type.
const FloatingField = ({
  id,
  name,
  label,
  required,
  type,
}: {
  id: string
  name: string
  label: string
  required?: boolean
  type?: string
}) => (
  <div className="relative w-full">
    <input
      id={id}
      name={name}
      type={type}
      required={required}
      placeholder=" "
      className="peer w-full h-[48px] px-4 pt-[22px] pb-[6px] text-[12px] lg:text-[14px] leading-none text-[#111111] bg-white border border-[#d0d0d0] focus:border-[#111111] outline-none focus:ring-0 rounded-none transition-colors"
    />
    <label
      htmlFor={id}
      data-no-global-float
      className="pointer-events-none absolute left-4 top-[7px] z-10 uppercase tracking-widest leading-none text-[9px] text-[#111111] transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[7px] peer-focus:translate-y-0"
    >
      {label}
    </label>
  </div>
)

export default function InlineAddAddress({
  region,
  customer,
}: {
  region: HttpTypes.StoreRegion
  customer: HttpTypes.StoreCustomer
}) {
  const [successState, setSuccessState] = useState(false)
  const [province, setProvince] = useState("")
  const [city, setCity] = useState("")

  const countryCode = region.countries?.[0]?.iso_2 || ""
  const { stateOptions, cityOptions } = useAddressLocations(countryCode, province)

  const [formState, formAction] = useActionState(addCustomerAddress, {
    success: false,
    error: null,
  } as { success: boolean; error: string | null })

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
      // Refresh to update the address list
      window.location.reload()
    }
  }, [formState])

  return (
    <div className="w-full max-w-[520px] mx-auto font-sans text-[#111111] text-left">
      <form action={formAction} className="flex flex-col w-full gap-y-4">
        
        <FloatingField id="firstName" name="first_name" label="Name" required />

        <FloatingField id="lastName" name="last_name" label="Surname" required />

        <div className="w-full border border-[#d0d0d0] h-[48px] px-4 flex flex-col justify-center bg-white">
          <label className="text-[9px] uppercase tracking-widest text-[#111111] leading-none" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            readOnly
            value={customer.email}
            className="w-full text-[12px] lg:text-[14px] text-[#111111] bg-transparent outline-none p-0 m-0 border-none cursor-not-allowed"
          />
        </div>

        <div className="w-full border border-[#d0d0d0] h-[48px] flex items-center focus-within:border-[#111111] bg-white transition-colors">
          <div className="flex items-center px-4 border-r border-[#d0d0d0] h-[24px] text-[12px] lg:text-[14px] shrink-0">
            <span>+91</span>
            <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
          <div className="relative flex-1 h-full">
            <input
              id="phone"
              name="phone"
              placeholder=" "
              className="peer w-full h-full px-4 pt-[22px] pb-[6px] text-[12px] lg:text-[14px] leading-none text-[#111111] bg-transparent outline-none border-none focus:ring-0"
            />
            <label
              htmlFor="phone"
              data-no-global-float
              className="pointer-events-none absolute left-4 top-[7px] z-10 uppercase tracking-widest leading-none text-[9px] text-[#111111] transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[7px] peer-focus:translate-y-0"
            >
              Mobile
            </label>
          </div>
        </div>

        <div className="w-full border border-[#d0d0d0] h-[48px] px-4 flex flex-col justify-center bg-white">
          <label className="text-[9px] uppercase tracking-widest text-[#111111] leading-none" htmlFor="countryCode">Country</label>
          <input type="hidden" name="country_code" value={region.countries?.[0]?.iso_2 || ""} />
          <select
            id="countryCode"
            disabled
            defaultValue={region.countries?.[0]?.iso_2 || ""}
            className="w-full text-[12px] lg:text-[14px] text-[#111111] bg-transparent outline-none appearance-none cursor-not-allowed p-0 m-0 border-none focus:ring-0"
          >
            {region.countries?.map((c) => (
              <option key={c.iso_2} value={c.iso_2}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>

        <FloatingField id="address" name="address_1" label="Address" required />

        <FloatingField
          id="postalCode"
          name="postal_code"
          label="Postcode"
          required
        />

        <div className="relative w-full">
          <Select
            inputId="province"
            options={stateOptions}
            value={province ? { value: province, label: province } : null}
            onChange={(selectedOption: any) => {
              setProvince(selectedOption?.value || "")
              setCity("")
            }}
            isDisabled={!countryCode}
            placeholder=""
            className="text-[12px] lg:text-[14px]"
            styles={formSelectStyles}
          />
          <label
            htmlFor="province"
            data-no-global-float
            className="pointer-events-none absolute left-4 top-[7px] z-10 uppercase tracking-widest leading-none text-[9px] text-[#111111]"
          >
            State
          </label>
        </div>
        <input type="hidden" name="province" value={province} />

        <div className="relative w-full">
          <Select
            inputId="city"
            options={province ? cityOptions : []}
            value={city ? { value: city, label: city } : null}
            onChange={(selectedOption: any) => setCity(selectedOption?.value || "")}
            isDisabled={!province}
            placeholder=""
            className="text-[12px] lg:text-[14px]"
            styles={formSelectStyles}
          />
          <label
            htmlFor="city"
            data-no-global-float
            className="pointer-events-none absolute left-4 top-[7px] z-10 uppercase tracking-widest leading-none text-[9px] text-[#111111]"
          >
            Town / City
          </label>
        </div>
        <input type="hidden" name="city" value={city} />

        {formState.error && (
          <div className="text-red-500 text-[12px] lg:text-[14px] py-2">
            {formState.error}
          </div>
        )}

        <p className="text-[12px] lg:text-[14px] mt-6 mb-6 text-[#111111] text-left">
          This will be saved as your default delivery address.
        </p>

        <button
          type="submit"
          className="w-full border border-black bg-black text-white hover:bg-white hover:text-black transition-colors h-[48px] text-xs lg:text-sm font-semibold uppercase tracking-widest"
        >
          SAVE ADDRESS
        </button>

        <p className="text-[12px] lg:text-[14px] mt-4 text-[#111111] text-left">
          By continuing, you confirm you have read the <a href="#" className="font-bold underline underline-offset-2 decoration-[1px] hover:text-[#555555]">Privacy Policy</a>
        </p>
      </form>
    </div>
  )
}
