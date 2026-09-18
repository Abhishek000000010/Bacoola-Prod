"use client"

import React, { useState } from "react"
import {
  NewsletterInterest,
  NewsletterPreferences,
  updateNewsletterPreferences,
} from "@lib/data/newsletter"

const INTERESTS: { id: NewsletterInterest; label: string }[] = [
  { id: "women", label: "Woman" },
  { id: "men", label: "Man" },
  { id: "teen", label: "Teen" },
  { id: "kids", label: "Kids" },
]

const Checkbox = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) => (
  <label className="flex items-center gap-x-3 cursor-pointer group">
    <div className="relative flex items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer appearance-none w-4 h-4 border border-[#cccccc] rounded-none checked:bg-black checked:border-black transition-colors"
      />
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100">
        <path d="M11.5 11.5h-7v-7h7z"></path>
        <path fillRule="evenodd" d="M14 14H2V2h12zM3 13h10V3H3z" clipRule="evenodd"></path>
      </svg>
    </div>
    <span className="text-[12px] lg:text-[14px] tracking-wide text-[#111111]">{label}</span>
  </label>
)

/**
 * My subscriptions. "Contents" are the departments the customer wants to hear
 * about; "Channels" is e-mail only -- the one channel the store actually sends
 * (the old SMS / Post boxes saved nothing and had nothing behind them).
 * Unchecking e-mail unsubscribes the account's address.
 */
export default function SubscriptionsForm({ initial }: { initial: NewsletterPreferences }) {
  const [subscribed, setSubscribed] = useState(initial.subscribed)
  const [interests, setInterests] = useState<NewsletterInterest[]>(initial.interests)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const toggleInterest = (id: NewsletterInterest, on: boolean) => {
    setMessage(null)
    setInterests((prev) => (on ? Array.from(new Set([...prev, id])) : prev.filter((i) => i !== id)))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const result = await updateNewsletterPreferences({ subscribed, interests })
    setSaving(false)
    setMessage(
      result.ok
        ? {
            kind: "ok",
            text: subscribed
              ? "Saved. You're subscribed to our newsletter."
              : "Saved. You're unsubscribed from our newsletter.",
          }
        : { kind: "error", text: result.error }
    )
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-y-12">
      <section>
        <h2 className="text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] mb-6">
          Contents
        </h2>
        <div className="flex flex-col gap-y-4">
          {INTERESTS.map((i) => (
            <Checkbox
              key={i.id}
              label={i.label}
              checked={interests.includes(i.id)}
              onChange={(on) => toggleInterest(i.id, on)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.05em] mb-6">
          Channels
        </h2>
        <div className="flex flex-col gap-y-4">
          <Checkbox
            label="e-mail"
            checked={subscribed}
            onChange={(on) => {
              setMessage(null)
              setSubscribed(on)
            }}
          />
        </div>
      </section>

      <div>
        <button
          type="submit"
          disabled={saving}
          className="w-full border border-[#111111] bg-[#111111] hover:bg-white hover:text-[#111111] text-white transition-colors h-[48px] text-[12px] lg:text-[14px] font-bold uppercase tracking-[0.1em] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <p
          role="status"
          aria-live="polite"
          className={`mt-4 min-h-[18px] text-[12px] lg:text-[14px] ${message?.kind === "error" ? "text-sale" : "text-[#111111]"}`}
        >
          {message?.text ?? ""}
        </p>
      </div>
    </form>
  )
}
