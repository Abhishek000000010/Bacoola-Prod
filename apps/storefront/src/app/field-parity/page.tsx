"use client"

// TEMPORARY diagnostic route -- delete after checking field parity.
import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"
import { formSelectStyles } from "@modules/common/components/select-styles"
import Select from "react-select"

export default function FieldParity() {
  return (
    <div className="flex flex-col gap-4 p-10 w-[600px]">
      <Input
        label="Postcode"
        name="postcode"
        required
        defaultValue="421305"
        data-probe="input-filled"
      />
      <Input label="Address" name="address" required data-probe="input-empty" />

      <div className="relative w-full" data-probe="nativeselect">
        <label className="pointer-events-none absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none text-black">
          Country
          <span className="ml-1 text-rose-500">*</span>
        </label>
        <NativeSelect name="country" value="in" onChange={() => {}} placeholder="">
          <option value="in">India</option>
        </NativeSelect>
      </div>

      <div className="relative flex flex-col gap-1" data-probe="reactselect-filled">
        <Select
          options={[{ value: "Andhra Pradesh", label: "Andhra Pradesh" }]}
          value={{ value: "Andhra Pradesh", label: "Andhra Pradesh" }}
          placeholder=""
          className="text-[12px] lg:text-[14px]"
          styles={formSelectStyles}
        />
        <label className="pointer-events-none absolute left-4 z-10 leading-none transition-all duration-300 ease-in-out text-black top-[7px] text-[12px] lg:text-[14px]">
          State / Province
        </label>
      </div>

      <div className="relative flex flex-col gap-1" data-probe="reactselect-empty">
        <Select
          options={[]}
          value={null}
          placeholder=""
          className="text-[12px] lg:text-[14px]"
          styles={formSelectStyles}
        />
        <label className="pointer-events-none absolute left-4 z-10 leading-none transition-all duration-300 ease-in-out text-black top-1/2 -translate-y-1/2 text-[12px]">
          Town / City
        </label>
      </div>
    </div>
  )
}
