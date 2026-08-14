import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

/**
 * Makes the admin default to the light theme instead of following the OS.
 *
 * Medusa's ThemeProvider (@medusajs/dashboard, uneditable) defaults to "system"
 * when nothing is stored, so on a dark-mode OS the whole admin comes up dark —
 * which hides Bacoola's dark wordmark. We want light by default *without* taking
 * the dark-mode toggle away.
 *
 * The theme lives in localStorage under `medusa_admin_theme`. This widget seeds
 * that key to "light" only when it is completely unset — a first-run default. As
 * soon as a user picks anything from the user-menu toggle (including "system"),
 * that choice is written to the key and this seeding never fires again, so the
 * toggle keeps working exactly as before. We also flip the live <html> theme on
 * that first run so the current page turns light immediately rather than after a
 * reload.
 *
 * Registered on several high-traffic zones so it runs on whichever page the
 * admin lands on first (the post-login default is the order list). It renders
 * nothing.
 */
const THEME_KEY = "medusa_admin_theme"

const AdminThemeDefault = () => {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem(THEME_KEY)) return

    localStorage.setItem(THEME_KEY, "light")

    const html = document.documentElement
    html.classList.remove("dark")
    html.classList.add("light")
    html.style.colorScheme = "light"
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: [
    "order.list.before",
    "product.list.before",
    "customer.list.before",
    "product.details.before",
    "order.details.before",
  ],
})

export default AdminThemeDefault
