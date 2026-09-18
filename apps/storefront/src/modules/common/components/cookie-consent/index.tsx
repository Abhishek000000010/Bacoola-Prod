"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useEffect, useState } from "react"

export const COOKIE_CONSENT_NAME = "bacoola_cookie_consent"
export const COOKIE_CONSENT_EVENT = "bacoola:cookie-consent"
const OPEN_SETTINGS_EVENT = "bacoola:open-cookie-settings"

/** Reopens the dialog on its settings view, e.g. from the footer link. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
}

export type CookieCategory = "analytics" | "marketing"
export type CookiePreferences = Record<CookieCategory, boolean>

const CATEGORIES: {
  id: CookieCategory | "necessary"
  title: string
  description: string
}[] = [
  {
    id: "necessary",
    title: "Strictly necessary cookies",
    description:
      "Needed for the site to work: keeping you signed in, remembering your bag and completing checkout securely. These can't be switched off.",
  },
  {
    id: "analytics",
    title: "Analytics cookies",
    description:
      "Help us understand how the site is used, so we can measure and improve its performance.",
  },
  {
    id: "marketing",
    title: "Personalised advertising cookies",
    description:
      "Used to show you content and ads based on a profile built from your browsing habits.",
  },
]

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

const ALL: CookiePreferences = { analytics: true, marketing: true }
const NONE: CookiePreferences = { analytics: false, marketing: false }

// Stored as the granted optional categories joined by "." ("none" when none).
// "accepted" / "rejected" are the values the earlier two-button banner wrote.
function parse(value: string): CookiePreferences | null {
  if (value === "accepted") return ALL
  if (value === "rejected" || value === "none") return NONE

  const granted = value.split(".")
  if (!granted.every((c) => c === "analytics" || c === "marketing")) {
    return null
  }

  return {
    analytics: granted.includes("analytics"),
    marketing: granted.includes("marketing"),
  }
}

function serialize(prefs: CookiePreferences) {
  const granted = (Object.keys(prefs) as CookieCategory[]).filter(
    (c) => prefs[c]
  )
  return granted.length ? granted.join(".") : "none"
}

export function getCookieConsent(): CookiePreferences | null {
  if (typeof document === "undefined") return null

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_CONSENT_NAME}=([^;]*)`)
  )

  return match ? parse(match[1]) : null
}

/**
 * Analytics and marketing scripts must check this before loading, and listen
 * for COOKIE_CONSENT_EVENT (detail: CookiePreferences) to start once the
 * visitor opts in.
 */
export function hasConsent(category: CookieCategory) {
  return getCookieConsent()?.[category] ?? false
}

const Toggle = ({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
  label: string
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
      checked ? "bg-neutral-950" : "bg-neutral-300"
    } disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-0.5"
      }`}
    />
  </button>
)

const buttonBase =
  "w-full small:w-auto whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.02em] py-3.5 px-6 transition-colors"
const outlineButton = `${buttonBase} border border-neutral-950 bg-white text-neutral-950 hover:bg-neutral-100`
const solidButton = `${buttonBase} border border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800`

const CookieConsentBanner = () => {
  // Stays hidden until mounted: the cookie is only readable in the browser, and
  // rendering it on the server would flash the dialog for visitors who already chose.
  const [visible, setVisible] = useState(false)
  const [view, setView] = useState<"intro" | "settings">("intro")
  const [prefs, setPrefs] = useState<CookiePreferences>(NONE)

  useEffect(() => {
    setVisible(getCookieConsent() === null)

    const open = () => {
      setPrefs(getCookieConsent() ?? NONE)
      setView("settings")
      setVisible(true)
    }
    window.addEventListener(OPEN_SETTINGS_EVENT, open)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open)
  }, [])

  const save = (value: CookiePreferences) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${COOKIE_CONSENT_NAME}=${serialize(value)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`
    window.dispatchEvent(
      new CustomEvent<CookiePreferences>(COOKIE_CONSENT_EVENT, {
        detail: value,
      })
    )
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center small:inset-0 small:items-center small:p-6 pointer-events-none">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="cookie-consent-title"
        className="pointer-events-auto w-full max-w-[768px] max-h-[90vh] overflow-y-auto bg-white text-neutral-950 shadow-[0_8px_40px_rgba(0,0,0,0.18)] px-6 py-8 small:px-14 small:py-12"
      >
        {view === "intro" ? (
          <>
            <h2
              id="cookie-consent-title"
              className="text-[15px] small:text-[16px] font-semibold uppercase tracking-[0.01em]"
            >
              Cookies enhance your shopping experience
            </h2>
            <p className="mt-5 text-[13px] small:text-[14px] leading-6 text-neutral-800">
              We use our own and third-party cookies for analytical purposes
              and to show you personalised advertising and content based on a
              profile prepared from your browsing habits. You can accept all
              the cookies or manage your preferences in the settings panel. For
              more information, please consult the{" "}
              <LocalizedClientLink
                href="/privacy-policy"
                className="font-semibold underline underline-offset-2"
              >
                Cookies Policy
              </LocalizedClientLink>
              .
            </p>
            <div className="mt-8 flex flex-col-reverse gap-3 small:flex-row small:items-center small:justify-end small:gap-3">
              <button
                type="button"
                onClick={() => {
                  setPrefs(NONE)
                  setView("settings")
                }}
                className="py-3 small:py-0 small:mr-3 text-[13px] font-semibold uppercase tracking-[0.02em] underline underline-offset-4 decoration-1 hover:text-neutral-600"
              >
                Set cookies
              </button>
              <button
                type="button"
                onClick={() => save(NONE)}
                className={outlineButton}
              >
                Only necessary cookies
              </button>
              <button
                type="button"
                onClick={() => save(ALL)}
                className={solidButton}
              >
                Accept all
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2
                id="cookie-consent-title"
                className="text-[15px] small:text-[16px] font-semibold uppercase tracking-[0.01em]"
              >
                Cookie settings
              </h2>
              <button
                type="button"
                onClick={() => setView("intro")}
                className="text-[13px] font-semibold uppercase tracking-[0.02em] underline underline-offset-4 decoration-1 hover:text-neutral-600"
              >
                Back
              </button>
            </div>
            <ul className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
              {CATEGORIES.map((category) => {
                const locked = category.id === "necessary"
                const checked =
                  category.id === "necessary" ? true : prefs[category.id]

                return (
                  <li
                    key={category.id}
                    className="flex items-start justify-between gap-6 py-5"
                  >
                    <div>
                      <p className="text-[13px] small:text-[14px] font-semibold">
                        {category.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-neutral-600">
                        {category.description}
                      </p>
                    </div>
                    <Toggle
                      label={category.title}
                      checked={checked}
                      disabled={locked}
                      onChange={(value) =>
                        category.id !== "necessary" &&
                        setPrefs((p) => ({ ...p, [category.id]: value }))
                      }
                    />
                  </li>
                )
              })}
            </ul>
            <div className="mt-8 flex flex-col-reverse gap-3 small:flex-row small:justify-end">
              <button
                type="button"
                onClick={() => save(prefs)}
                className={outlineButton}
              >
                Confirm my choices
              </button>
              <button
                type="button"
                onClick={() => save(ALL)}
                className={solidButton}
              >
                Accept all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CookieConsentBanner
