import { Metadata } from "next"

import ProfilePhone from "@modules/account/components/profile-phone"
import ProfilePassword from "@modules/account/components/profile-password"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import ProfileDob from "@modules/account/components/profile-dob"
import ProfileGender from "@modules/account/components/profile-gender"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and edit your Bacoola profile.",
}

export default async function Profile() {
  const [customer, regions] = await Promise.all([
    retrieveCustomer(),
    listRegions(),
  ])

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div
      className="w-full flex flex-col items-start pt-[16px] pb-20 font-sans text-[#111111]"
      data-testid="profile-page-wrapper"
    >
      <div className="w-full max-w-[420px]">
        <h1 className="text-[12px] lg:text-[14px] font-bold uppercase tracking-wide mb-[34px]">
          MY DETAILS
        </h1>
        
        <div className="flex flex-col w-full">
          <ProfileName customer={customer} />
          <ProfileEmail customer={customer} />
          <ProfilePhone customer={customer} />
          <ProfilePassword customer={customer} />
          
          <ProfileDob customer={customer} />
          <ProfileGender customer={customer} />
          
          <div className="w-full flex items-start mt-[4px]">
            <button className="text-[12px] lg:text-[14px] font-semibold uppercase underline underline-offset-2 text-[#111111] hover:text-[#555555] transition-colors focus:outline-none">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type DetailRowProps = {
  label: string
  value: string
  action: "ADD" | "EDIT"
  "data-testid"?: string
}

const DetailRow = ({ label, value, action, "data-testid": dataTestid }: DetailRowProps) => {
  return (
    <div className="w-full mb-[28px]" data-testid={dataTestid}>
      <div className="grid w-full grid-cols-[minmax(0,1fr)_56px] items-start gap-x-4">
        <div className="flex flex-col items-start">
          <span className="text-[12px] lg:text-[14px] font-semibold leading-[1.3] text-[#111111]">
            {label}
          </span>
          <span className="mt-[2px] text-[12px] lg:text-[14px] font-normal leading-[1.6] text-[#111111]">
            {value}
          </span>
        </div>
        <div className="flex justify-start pt-0">
          <button
            type="button"
            className="text-[12px] lg:text-[14px] font-semibold uppercase underline underline-offset-2 text-[#111111] hover:text-[#555555] transition-colors focus:outline-none"
          >
            {action}
          </button>
        </div>
      </div>
    </div>
  )
}
