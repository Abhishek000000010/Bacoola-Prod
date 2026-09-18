"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams } from "next/navigation"
import { Fragment, useState } from "react"
import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"

const AccountDropdown = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { countryCode } = useParams() as { countryCode: string }

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  const handleLogout = async () => {
    await signout(countryCode)
  }

  return (
    <div
      className="h-full z-50 flex items-center"
      onMouseEnter={open}
      onMouseLeave={close}
    >
      <Popover className="relative flex items-center">
        <PopoverButton className="focus:outline-none flex items-center cursor-pointer group py-2">
          <LocalizedClientLink
            href="/account"
            className={`text-[12px] font-semibold uppercase tracking-wider text-[#111111] transition-colors duration-200 ${isOpen ? 'nav-underline nav-underline-active' : 'nav-underline'}`}
            data-testid="nav-account-link"
          >
            MY ACCOUNT
          </LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={isOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-2"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-2"
        >
          <PopoverPanel
            static
            className="absolute top-[100%] right-1/2 translate-x-[50%] pt-[8px] w-[320px]"
          >
            <div className="relative bg-white border border-[#111111] shadow-sm py-8 px-6 flex flex-col gap-y-6 text-[12px] font-bold text-[#111111]">
              <div className="absolute -top-[6px] right-1/2 translate-x-1/2 w-[10px] h-[10px] bg-white border-t border-l border-[#111111] rotate-45"></div>
              
              <LocalizedClientLink href="/account" onClick={close} className="flex w-full items-center justify-between hover:text-[#555555] uppercase tracking-[0.02em]">
                <span>MY ACCOUNT</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" strokeLinejoin="miter"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </LocalizedClientLink>
              <LocalizedClientLink href="/account/orders" onClick={close} className="flex w-full items-center justify-between hover:text-[#555555] uppercase tracking-[0.02em]">
                <span>MY PURCHASES</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" strokeLinejoin="miter"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </LocalizedClientLink>
              <LocalizedClientLink href="/help" onClick={close} className="flex w-full items-center justify-between hover:text-[#555555] uppercase tracking-[0.02em]">
                <span>HELP</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" strokeLinejoin="miter"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </LocalizedClientLink>
              <button onClick={() => { close(); handleLogout(); }} className="flex w-full items-center justify-between uppercase hover:text-[#555555] tracking-[0.02em]">
                <span>SIGN OUT</span>
              </button>
            </div>
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default AccountDropdown
