"use client"

import React, { useState } from "react"
import PanelShell from "../panel-shell"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * "Notify me when back in stock" slide-over.
 *
 * The shopper picked a size that's sold out; this captures an email and posts it
 * to POST /store/restock-subscriptions. When an admin restocks that variant the
 * backend's restock-notify subscriber emails them.
 */
export default function NotifyRestockPanel({
  onClose,
  variantId,
  productTitle,
  variantTitle,
}: {
  onClose: () => void
  variantId: string
  productTitle?: string
  variantTitle?: string
}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">(
    "idle"
  )

  const valid = EMAIL_RE.test(email.trim())

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || status === "submitting") return
    setStatus("submitting")
    try {
      const res = await fetch(`${BACKEND_URL}/store/restock-subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ email: email.trim(), variant_id: variantId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus("done")
    } catch {
      setStatus("error")
    }
  }

  return (
    <PanelShell title="Receive notification" onClose={onClose} maxWidth="480px" bodyClassName="">
      <div className="px-6 pb-10 pt-6 sm:px-8">
        {status === "done" ? (
          <div className="flex flex-col items-start gap-y-3">
            <p className="text-[13px] lg:text-[15px] font-bold text-neutral-900">
              You&apos;re on the list.
            </p>
            <p className="text-[12px] lg:text-[14px] leading-relaxed text-neutral-600">
              We&apos;ll email <strong>{email.trim()}</strong> as soon as
              {variantTitle ? ` "${variantTitle}"` : " this item"} is back in
              stock.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 bg-[#181818] px-6 py-3 text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] text-white transition-colors hover:bg-black"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col">
            <p className="mb-6 text-[12px] lg:text-[14px] leading-relaxed text-neutral-700">
              We will notify you immediately if the item becomes available again.
            </p>

            {(productTitle || variantTitle) && (
              <div className="mb-6 border-y border-neutral-200 py-3 text-[12px] lg:text-[14px]">
                {productTitle && (
                  <div className="font-bold uppercase text-neutral-900">
                    {productTitle}
                  </div>
                )}
                {variantTitle && (
                  <div className="mt-1 text-neutral-500">{variantTitle}</div>
                )}
              </div>
            )}

            <label
              htmlFor="restock-email"
              className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-neutral-500"
            >
              E-mail
            </label>
            <input
              id="restock-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (status === "error") setStatus("idle")
              }}
              placeholder="you@example.com"
              autoComplete="email"
              className="border border-neutral-300 px-3 py-3 text-[13px] lg:text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none"
            />

            {status === "error" && (
              <p className="mt-3 text-[12px] text-[#BA0000]">
                Something went wrong. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={!valid || status === "submitting"}
              className="mt-6 bg-[#181818] py-3.5 text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              {status === "submitting" ? "Sending..." : "Receive notification"}
            </button>
          </form>
        )}
      </div>
    </PanelShell>
  )
}
