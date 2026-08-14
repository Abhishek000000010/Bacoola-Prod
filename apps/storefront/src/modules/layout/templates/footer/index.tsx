"use client"

import React from "react"
import { usePathname } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function Footer() {
  const pathname = usePathname()
  const isAccountPage = pathname?.includes("/account")
  const footerLinkClass =
    "nav-underline text-[12px] font-bold uppercase tracking-[0.05em] text-neutral-950"

  return (
    <footer className="w-full bg-white font-sans tracking-wide text-neutral-800">
      {!isAccountPage && (
        <div className="flex w-full flex-col items-center justify-center bg-white px-4 pb-16 pt-24 text-center">
          <h2 className="text-[12px] font-bold text-[#111111] mb-4">
            10% off your next purchase by subscribing to the newsletter
          </h2>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex flex-col small:flex-row items-center justify-center gap-2 w-full max-w-[287px] small:max-w-none"
          >
            <div className="flex flex-col border border-gray-300 bg-white text-left px-3 relative w-full small:w-[287px] h-[42px] justify-center">
              <input
                id="newsletter-form-email-input"
                name="email"
                type="email"
                autoComplete="email"
                aria-required="true"
                placeholder="E-mail"
                required
                className="w-full bg-transparent text-[12px] font-normal text-[#111111] focus:outline-none placeholder:text-gray-800"
              />
            </div>

            <button
              id="newsletter-form-submit-button"
              type="submit"
              className="h-[42px] w-full small:w-auto min-w-[140px] border border-black bg-white px-6 text-[12px] font-bold tracking-normal text-black transition-colors hover:bg-black hover:text-white"
            >
              SIGN UP NOW
            </button>
          </form>

          <p className="mt-4 text-[12px] font-normal text-[#111111]">
            By subscribing, you confirm that you have read the{" "}
            <LocalizedClientLink
              href="/privacy-policy"
              className="font-bold hover:text-gray-600 transition-colors"
            >
              Privacy Policy
            </LocalizedClientLink>
            .
          </p>
        </div>
      )}

      <div className="flex w-full justify-center py-10">
        <button
          className="flex items-center gap-x-2 text-[12px] font-bold uppercase tracking-[0.05em] text-neutral-950 transition-colors hover:text-neutral-600 focus:outline-none"
          aria-label="Select Country"
        >
          <span className="leading-none mt-[2px]">India</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-[2px]">
            <path d="M1 6H11M11 6L6.5 1.5M11 6L6.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-x-5 gap-y-5 sm:gap-x-8 sm:gap-y-3 px-4 pb-12 sm:px-6 sm:pb-16">
        <a href="https://instagram.com" target="_blank" rel="noreferrer" className={footerLinkClass}>
          Instagram
        </a>
        <a href="https://facebook.com" target="_blank" rel="noreferrer" className={footerLinkClass}>
          Facebook
        </a>
        <a href="https://youtube.com" target="_blank" rel="noreferrer" className={footerLinkClass}>
          Youtube
        </a>
        <a href="https://tiktok.com" target="_blank" rel="noreferrer" className={footerLinkClass}>
          Tiktok
        </a>
        <a href="https://spotify.com" target="_blank" rel="noreferrer" className={footerLinkClass}>
          Spotify
        </a>
        <a href="https://pinterest.com" target="_blank" rel="noreferrer" className={footerLinkClass}>
          Pinterest
        </a>
        <a href="https://twitter.com" target="_blank" rel="noreferrer" className={footerLinkClass}>
          X
        </a>
        <a href="https://linkedin.com" target="_blank" rel="noreferrer" className={footerLinkClass}>
          Linkedin
        </a>
      </div>

      <div className="mx-auto grid w-full max-w-none grid-cols-1 sm:grid-cols-2 justify-items-start gap-x-8 gap-y-5 px-8 py-12 sm:gap-y-12 sm:px-10 sm:py-16 md:grid-cols-4 xl:px-12">
        <div className="flex flex-col items-start gap-y-5">
          <LocalizedClientLink href="/help" className={footerLinkClass}>
            Help
          </LocalizedClientLink>
          <LocalizedClientLink href="/account/orders" className={footerLinkClass}>
            My Purchases
          </LocalizedClientLink>
          <LocalizedClientLink href="/help" className={footerLinkClass}>
            Returns
          </LocalizedClientLink>
        </div>

        <div className="flex flex-col items-start gap-y-5">
          <LocalizedClientLink href="/company" className={footerLinkClass}>
            Company
          </LocalizedClientLink>
          <LocalizedClientLink href="/careers" className={footerLinkClass}>
            Work for Bacoola
          </LocalizedClientLink>
          <LocalizedClientLink href="/press" className={footerLinkClass}>
            Press
          </LocalizedClientLink>
        </div>

        <div className="flex flex-col items-start gap-y-5">
          <LocalizedClientLink href="/outlet" className={footerLinkClass}>
            Bacoola Outlet
          </LocalizedClientLink>
          <LocalizedClientLink href="/sitemap" className={footerLinkClass}>
            Site Map
          </LocalizedClientLink>
          <LocalizedClientLink href="/responsibility" className={footerLinkClass}>
            Responsibility
          </LocalizedClientLink>
        </div>

        <div className="flex flex-col items-start gap-y-5">
          <LocalizedClientLink href="/stores" className={footerLinkClass}>
            Stores
          </LocalizedClientLink>
        </div>
      </div>

      <div className="w-full bg-white py-10">
        <div className="mx-auto flex w-full max-w-none flex-col items-start md:items-center justify-between gap-y-6 px-8 sm:px-10 md:flex-row xl:px-12">
          <div className="flex flex-col items-start gap-y-5 md:flex-row md:flex-wrap md:justify-start md:gap-x-6 md:gap-y-2">
            <LocalizedClientLink href="/privacy-policy" className={footerLinkClass}>
              Privacy Policy and Cookies
            </LocalizedClientLink>
            <LocalizedClientLink href="/terms-conditions" className={footerLinkClass}>
              Terms and Conditions
            </LocalizedClientLink>
            <LocalizedClientLink href="/ethics" className={footerLinkClass}>
              Ethics Channel
            </LocalizedClientLink>
          </div>

          <div className="select-none text-center text-[12px] font-bold tracking-[0.01em] text-neutral-950 md:ml-auto md:text-right">
            © {new Date().getFullYear()} BACOOLA All rights reserved
          </div>
        </div>
      </div>
    </footer>
  )
}
