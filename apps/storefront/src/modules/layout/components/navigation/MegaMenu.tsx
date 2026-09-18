import React, { useState, useEffect } from "react"
// nav-underline links use leading-none so the hover line hugs the text
import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface MegaMenuProps {
  activeCategory: string | null
  setActiveCategory: (category: string | null) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  categories?: HttpTypes.StoreProductCategory[]
}

const MegaMenu: React.FC<MegaMenuProps> = ({
  activeCategory,
  setActiveCategory,
  onMouseEnter,
  onMouseLeave,
  categories = [],
}) => {
  const [lastCategory, setLastCategory] = useState<string>("women")
  const [hoveredLevel2Id, setHoveredLevel2Id] = useState<string | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  useEffect(() => {
    if (activeCategory) {
      setLastCategory(activeCategory)
      setHoveredLevel2Id(null) // reset hover when switching main categories
      setActiveTabId(null) // reset tab when switching main categories
    }
  }, [activeCategory])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onMouseLeave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onMouseLeave])

  const isOpen = activeCategory !== null

  // 1. Find the root category (e.g. "women", "men", "teen", "kids")
  const rootCategory = categories.find((c) => c.handle === lastCategory)

  // 2. Find Level 2 categories (children of root)
  const level2Categories = rootCategory
    ? categories.filter((c) => c.parent_category_id === rootCategory.id)
    : []

  // Check if we need tabs (if lastCategory is teen or kids, which have 4 levels)
  const needsTabs = lastCategory === "teen" || lastCategory === "kids"

  // The active tab for Level 2 (e.g. "Teen Girl")
  const currentTabCategory = needsTabs 
    ? level2Categories.find(c => c.id === activeTabId) || level2Categories[0]
    : null

  // The categories shown in the Left Column
  const leftColumnCategories = needsTabs && currentTabCategory
    ? categories.filter(c => c.parent_category_id === currentTabCategory.id)
    : level2Categories

  // The categories shown in the Right Column
  const level3Categories = hoveredLevel2Id
    ? categories.filter((c) => c.parent_category_id === hoveredLevel2Id)
    : []

  const isKids = lastCategory === "kids"
  const colWidth = 265
  const expandedWidth = 530
  const baseWidth = 416
  const currentBaseWidth = lastCategory === "kids" ? 500 : baseWidth
  const panelWidth = isOpen && level3Categories.length > 0 ? expandedWidth : currentBaseWidth

  return (
    <>
      {/* 1. Backdrop -- one continuous element, full viewport, from x:0
          immediately. Sits below the panel (z-998 < z-999), which always
          masks it wherever the panel currently is -- during the open/close
          slide AND during a width change (e.g. Teen's 416px -> Kids' 500px)
          while already open. Because there's only one backdrop and one panel
          (see below), there's no second element that could ever drift out of
          sync with it. */}
      <div
        onClick={onMouseLeave}
        className={`fixed inset-0 z-[998] bg-black/30 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* 2. Mega Menu Container -- extends up through the header (top-0, not
          top-[56px]) so the SAME element that slides/resizes for the content
          area also covers the header row. A spacer below reserves the header's
          56px so the visible menu content still starts in the same place. */}
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`fixed top-0 left-0 bottom-0 bg-white z-[999] transition-all duration-300 ease-out select-none flex flex-col overflow-visible ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: `${panelWidth}px` }}
      >
        {/* Close button (always top right of the header row) */}
        <div className="absolute top-[10px] right-4 z-50">
          <button
            onClick={onMouseLeave}
            className="p-2 text-neutral-400 hover:text-black transition-colors duration-200 focus:outline-none"
            aria-label="Close menu"
          >
            <XMark className="w-5 h-5 stroke-[1.2px]" />
          </button>
        </div>

        {/* Header-height spacer so the tabs/columns below start at the same
            spot they did when this box only covered the content area. */}
        <div className="h-[56px] shrink-0" />

        {/* Top Header for Tabs (spans both columns) */}
        {needsTabs && (
          <div className="w-full pl-10 pr-4 pt-12 pb-2 flex flex-nowrap items-center gap-3 overflow-x-auto shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {level2Categories.map(tab => {
              const isActive = activeTabId === tab.id || (!activeTabId && level2Categories[0]?.id === tab.id)
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTabId(tab.id)
                    setHoveredLevel2Id(null)
                  }}
                  onMouseEnter={() => {
                    setActiveTabId(tab.id)
                    setHoveredLevel2Id(null)
                  }}
                  className={`py-1.5 px-1 text-[8px] small:text-[12px] whitespace-nowrap uppercase font-bold tracking-wider border-b transition-colors duration-200 ${
                    isActive
                      ? "border-black text-black"
                      : "border-transparent text-neutral-500 hover:text-black"
                  }`}
                >
                  {tab.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Two Columns Container */}
        <div className="flex flex-row flex-1 h-full overflow-hidden">
          {/* Left Column (Level 2 or 3 depending on tabs) */}
          <div className="shrink-0 h-full flex flex-col bg-white z-20 relative" style={{ width: `${colWidth}px` }}>
            <div className={`flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] pl-10 pr-4 ${needsTabs ? 'pt-4' : 'pt-8'} pb-8`}>
            
            {isKids && (
              <div className="text-[8px] small:text-[12px] text-neutral-500 mb-6">
                From 4 to 14 years
              </div>
            )}

            <div className="flex flex-col gap-y-1">
              {leftColumnCategories.map((cat) => {
                const isSale = cat.name.toUpperCase().includes("SALE")

                return (
                  <div
                    key={cat.id}
                    onMouseEnter={() => setHoveredLevel2Id(cat.id)}
                    className="w-full flex items-center group py-4"
                  >
                    <LocalizedClientLink
                      href={`/categories/${cat.handle}`}
                      onClick={() => {
                        setActiveCategory(null)
                        setHoveredLevel2Id(null)
                      }}
                      className={`nav-underline w-fit text-left text-[8px] small:text-[12px] leading-none uppercase tracking-wide font-bold transition-colors duration-200 ${
                        hoveredLevel2Id === cat.id ? "nav-underline-active" : ""
                      } ${
                        isSale
                          ? "text-[#BA0000]"
                          : hoveredLevel2Id === cat.id
                          ? "text-black"
                          : "text-neutral-500 hover:text-black"
                      }`}
                    >
                      {cat.name}
                    </LocalizedClientLink>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

          {/* Right Column (Level 3 or 4 Popup) */}
          <div 
            className="shrink-0 h-full bg-white flex flex-col transition-opacity duration-300 ease-in"
            style={{ 
              width: `${colWidth}px`,
              opacity: level3Categories.length > 0 ? 1 : 0 
            }}
          >
            <div 
              className={`flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] px-4 pb-8 h-full transition-opacity duration-500 ${
                level3Categories.length > 0 ? "opacity-100 delay-100" : "opacity-0 pointer-events-none"
              }`}
              style={{
                paddingTop: needsTabs ? (isKids ? '56px' : '16px') : '32px'
              }}
            >
              <div className="flex flex-col gap-y-1">
              {level3Categories.map((cat) => (
                <div key={cat.id} className="w-full flex items-center py-4">
                  <LocalizedClientLink
                    href={`/categories/${cat.handle}`}
                    onClick={() => {
                      setActiveCategory(null)
                      setHoveredLevel2Id(null)
                    }}
                    className="nav-underline w-fit text-left text-[8px] small:text-[12px] leading-none font-bold uppercase tracking-wide text-[#111111] transition-colors duration-200"
                  >
                    {cat.name}
                  </LocalizedClientLink>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}

export default MegaMenu
