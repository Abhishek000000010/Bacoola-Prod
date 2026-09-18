"use client"

import React, { useState, Fragment, useEffect } from "react"
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react"
import { XMark, ArrowRightMini } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import useToggleState from "@lib/hooks/use-toggle-state"
import { Locale } from "@lib/data/locales"
import { clx } from "@modules/common/components/ui"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"

import CategoryTabs from "./CategoryTabs"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CategoryKey } from "./menu-data"

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  categories?: HttpTypes.StoreProductCategory[]
}

const SideMenu: React.FC<SideMenuProps> = ({ regions, locales, currentLocale, categories = [] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<CategoryKey>("women")
  const [activeSubcategory, setActiveSubcategory] = useState<HttpTypes.StoreProductCategory | null>(null)
  
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  // Open and close helper functions
  const openDrawer = () => setIsOpen(true)
  const closeDrawer = () => {
    setIsOpen(false)
    setTimeout(() => setActiveSubcategory(null), 300) // Reset after animation
  }

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="h-full flex items-center">
      {/* Trigger Button */}
      <button
        data-testid="nav-menu-button"
        aria-label="Menu"
        onClick={openDrawer}
        className="relative h-full flex items-center transition-all ease-out duration-200 focus:outline-none hover:opacity-70"
      >
        <span className="hidden small:block text-xs uppercase tracking-[0.2em] font-semibold hover:text-neutral-500">
          Menu
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-[#111111] small:hidden">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Navigation Drawer */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog onClose={closeDrawer} className="relative z-[9999]">
          {/* Backdrop Blur/Overlay */}
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/15 backdrop-blur-[2px] transition-opacity" />
          </TransitionChild>

          {/* Sliding Panel */}
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
                <TransitionChild
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="-translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-250"
                  leaveFrom="translate-x-0"
                  leaveTo="-translate-x-full"
                >
                  <DialogPanel className="pointer-events-auto w-screen max-w-full sm:max-w-[360px] md:max-w-[420px] bg-white shadow-xl overflow-hidden">
                    {/* Double-width sliding container */}
                    <div className={`flex w-full h-full transition-transform duration-300 ease-in-out ${activeSubcategory ? '-translate-x-full' : 'translate-x-0'}`}>
                      
                      {/* MAIN PANEL */}
                      <div className="w-full flex-shrink-0 h-full flex flex-col bg-white select-none relative">
                        {/* Top Bar with Tabs and Close button */}
                        <div className="flex items-center justify-between border-b border-neutral-100 pl-8 pr-4 py-4">
                          {/* Top Category Tabs (Women, Men, Teen, Kids) */}
                          <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
                          
                          <button
                            onClick={closeDrawer}
                            data-testid="close-menu-button"
                            className="p-2 ml-4 flex-shrink-0 text-neutral-400 hover:text-black transition-colors duration-200 focus:outline-none"
                            aria-label="Close panel"
                          >
                            <XMark className="w-6 h-6 stroke-[1.2px]" />
                          </button>
                        </div>

                        {/* Main Menu Scrollable Body */}
                        <div className="relative flex-1 overflow-y-auto px-8 py-4 scrollbar-none">
                          
                          {/* View All Link for the active tab category */}
                          <LocalizedClientLink
                            href={`/landingpage/${activeTab}`}
                            onClick={closeDrawer}
                            className="block w-full text-left py-3.5 text-xs uppercase tracking-wide font-semibold text-black transition-colors duration-200 mb-2"
                          >
                            VIEW ALL
                          </LocalizedClientLink>

                          {categories
                            .filter((c) => c.parent_category_id === categories.find((cat) => cat.handle === activeTab)?.id)
                            .map((cat) => {
                              const hasChildren = categories.some((c) => c.parent_category_id === cat.id);
                              
                              if (hasChildren) {
                                return (
                                  <button
                                    key={cat.id}
                                    onClick={() => setActiveSubcategory(cat)}
                                    className={`block w-full text-left py-3.5 text-xs uppercase tracking-wide font-semibold transition-colors duration-200 ${
                                      cat.name.toUpperCase().includes("SALE")
                                        ? "text-[#D01313] hover:text-[#B01010]"
                                        : "text-black"
                                    }`}
                                  >
                                    {cat.name}
                                  </button>
                                );
                              }

                              return (
                                <LocalizedClientLink
                                  key={cat.id}
                                  href={`/categories/${cat.handle}`}
                                  onClick={closeDrawer}
                                  className={`block w-full text-left py-3.5 text-xs uppercase tracking-wide font-semibold transition-colors duration-200 ${
                                    cat.name.toUpperCase().includes("SALE")
                                      ? "text-[#D01313] hover:text-[#B01010]"
                                      : "text-black"
                                  }`}
                                >
                                  {cat.name}
                                </LocalizedClientLink>
                              );
                            })}
                        </div>


                      </div>

                      {/* SUBMENU PANEL */}
                      <div className="w-full flex-shrink-0 h-full flex flex-col bg-white select-none">
                        {activeSubcategory && (
                          <>
                            {/* Submenu Header */}
                            <div className="flex items-center justify-between pl-4 pr-4 pt-4 pb-4 border-b border-neutral-100">
                              <div className="flex items-center gap-x-2">
                                <button
                                  onClick={() => setActiveSubcategory(null)}
                                  className="p-2 text-black transition-colors focus:outline-none"
                                  aria-label="Back"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                  </svg>
                                </button>
                                <div className="text-xs font-semibold uppercase tracking-wide text-[#111111]">
                                  {activeSubcategory.name} <span className="text-neutral-400 ml-1">{activeTab}</span>
                                </div>
                              </div>
                              <button
                                onClick={closeDrawer}
                                className="p-2 text-neutral-400 hover:text-black transition-colors focus:outline-none"
                              >
                                <XMark className="w-6 h-6 stroke-[1.2px]" />
                              </button>
                            </div>

                            {/* Submenu Scrollable List */}
                            <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-none">
                              <LocalizedClientLink
                                href={`/categories/${activeSubcategory.handle}`}
                                onClick={closeDrawer}
                                className="block w-full text-left py-3.5 text-xs uppercase tracking-wide font-semibold text-black transition-colors duration-200 mb-2"
                              >
                                SEE ALL
                              </LocalizedClientLink>

                              {categories
                                .filter((c) => c.parent_category_id === activeSubcategory.id)
                                .filter((c) => c.name.toUpperCase() !== "SEE ALL")
                                .map((subcat) => (
                                  <LocalizedClientLink
                                    key={subcat.id}
                                    href={`/categories/${subcat.handle}`}
                                    onClick={closeDrawer}
                                    className="block w-full text-left py-3.5 text-xs uppercase tracking-wide font-semibold text-black transition-colors duration-200"
                                  >
                                    {subcat.name}
                                  </LocalizedClientLink>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

export default SideMenu
