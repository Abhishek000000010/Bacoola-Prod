"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Fragment, useState } from "react"

const LoginDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

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
            LOG IN
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
            className="absolute top-[100%] right-[-180px] pt-[8px] w-[400px]"
          >
            <div className="relative bg-white border border-[#111111] shadow-sm px-10 py-10 flex flex-col gap-y-8 text-[12px] font-bold text-[#111111]">
              <div className="absolute -top-[6px] right-[207px] translate-x-1/2 w-[10px] h-[10px] bg-white border-t border-l border-[#111111] rotate-45"></div>
              
              <div className="flex flex-col gap-y-4 text-center">
                <LocalizedClientLink
                  href="/account"
                  onClick={close}
                  className="border border-[#111111] bg-[#111111] text-white py-3 px-4 uppercase tracking-[0.05em] font-bold w-full flex items-center justify-center hover:bg-white hover:text-[#111111] transition-colors"
                >
                  SIGN IN
                </LocalizedClientLink>
                <div className="font-normal text-[12px] mt-2 tracking-wide">
                  <span className="text-[#111111]">Don't have an account? </span>
                  <LocalizedClientLink href="/account" onClick={close} className="underline text-[#111111] hover:text-[#555555] font-semibold">
                    Register
                  </LocalizedClientLink>
                </div>
              </div>

              <div className="flex flex-col gap-y-8">
                <LocalizedClientLink href="/account/orders" onClick={close} className="flex w-full items-center justify-between hover:text-[#555555] uppercase tracking-[0.02em]">
                  <span>MY PURCHASES</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </LocalizedClientLink>
                <LocalizedClientLink href="/help" onClick={close} className="flex w-full items-center justify-between hover:text-[#555555] uppercase tracking-[0.02em]">
                  <span>HELP</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </LocalizedClientLink>
              </div>
            </div>
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default LoginDropdown
