import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useRef } from "react"
import bacoolaLogo from "../assets/bacoola-logo.png"

/**
 * Bacoola branding for the admin login screen.
 *
 * The login page (@medusajs/dashboard) is a prebuilt package we can't edit, but
 * it exposes a `login.before` injection zone that renders just above the form,
 * right after Medusa's default avatar + "Welcome to Medusa" heading. This widget
 * mounts there and does three things:
 *
 *   1. Renders the Bacoola wordmark where the branding belongs.
 *   2. Hides Medusa's default avatar + heading block. They are the login
 *      container's children *before* the form column, so we walk back from our
 *      own node and hide each previous sibling — robust against class/i18n
 *      changes, and it never touches the "Forgot password?" link that sits after
 *      the form.
 *   3. Forces the login page to the light theme. The Bacoola logo is a dark
 *      wordmark and is invisible on Medusa's dark theme; forcing light here makes
 *      it legible. This is scoped to the login page only — the effect restores
 *      the previous <html> theme classes on unmount, so the authenticated admin
 *      keeps following the user's own light/dark toggle.
 */
const LoginBranding = () => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // (2) Hide Medusa's avatar + heading — every sibling before the form column.
    const formColumn = node.parentElement
    const hidden: HTMLElement[] = []
    let sibling = formColumn?.previousElementSibling as HTMLElement | null
    while (sibling) {
      hidden.push(sibling)
      sibling.style.display = "none"
      sibling = sibling.previousElementSibling as HTMLElement | null
    }

    // (3) Force light theme for the login page, remembering what to restore.
    const html = document.documentElement
    const hadDark = html.classList.contains("dark")
    const hadLight = html.classList.contains("light")
    const prevColorScheme = html.style.colorScheme
    html.classList.remove("dark")
    html.classList.add("light")
    html.style.colorScheme = "light"

    return () => {
      hidden.forEach((el) => {
        el.style.display = ""
      })
      html.classList.toggle("dark", hadDark)
      html.classList.toggle("light", hadLight)
      html.style.colorScheme = prevColorScheme
    }
  }, [])

  return (
    <div ref={ref} className="mb-4 flex w-full flex-col items-center">
      <img
        src={bacoolaLogo}
        alt="Bacoola"
        className="mb-3 h-auto w-[180px] max-w-full"
      />
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginBranding
