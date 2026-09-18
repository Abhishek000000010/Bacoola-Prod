"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

/**
 * Newsletter server actions. They run on the Next server, so the browser never
 * calls the backend directly (no CORS, and the customer's JWT stays in its
 * httpOnly cookie). Backend routes: apps/backend/src/api/store/newsletter and
 * store/customers/me/newsletter.
 */

export type NewsletterInterest = "women" | "men" | "teen" | "kids"

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

const errorMessage = (e: any, fallback: string) =>
  e?.message && !/fetch failed|ECONNREFUSED/i.test(e.message) ? e.message : fallback

export async function subscribeToNewsletter(
  email: string
): Promise<ActionResult<{ status: "subscribed" | "already_subscribed" }>> {
  try {
    const data = await sdk.client.fetch<{ status: "subscribed" | "already_subscribed" }>(
      "/store/newsletter",
      { method: "POST", body: { email: email.trim(), source: "footer" }, cache: "no-store" }
    )
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, error: errorMessage(e, "Something went wrong. Please try again.") }
  }
}

export async function unsubscribeFromNewsletter(
  token: string
): Promise<ActionResult<{ email: string }>> {
  try {
    const data = await sdk.client.fetch<{ email: string }>("/store/newsletter/unsubscribe", {
      method: "POST",
      body: { token },
      cache: "no-store",
    })
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, error: errorMessage(e, "We couldn't process this link. Please try again.") }
  }
}

export type NewsletterPreferences = { subscribed: boolean; interests: NewsletterInterest[] }

export async function getNewsletterPreferences(): Promise<NewsletterPreferences | null> {
  const headers = await getAuthHeaders()
  if (!("authorization" in headers)) return null
  try {
    return await sdk.client.fetch<NewsletterPreferences>("/store/customers/me/newsletter", {
      headers,
      cache: "no-store",
    })
  } catch {
    return null
  }
}

export async function updateNewsletterPreferences(
  prefs: NewsletterPreferences
): Promise<ActionResult<NewsletterPreferences>> {
  const headers = await getAuthHeaders()
  if (!("authorization" in headers)) return { ok: false, error: "Please sign in again." }
  try {
    const data = await sdk.client.fetch<NewsletterPreferences>("/store/customers/me/newsletter", {
      method: "POST",
      headers,
      body: prefs,
      cache: "no-store",
    })
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, error: errorMessage(e, "Could not save your preferences. Please try again.") }
  }
}
