"use client"

import React, { useEffect, useRef, useState } from "react"
import { subscribeToNewsletter } from "@lib/data/newsletter"

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string }

const CONFIRMATION_AUTO_DISMISS_MS = 4000

/** The footer sign-up form. Saves the address and shows a confirmation toast. */
export default function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [state, setState] = useState<State>({ kind: "idle" })
  const [showConfirmation, setShowConfirmation] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (state.kind === "submitting") return
    setState({ kind: "submitting" })

    const result = await subscribeToNewsletter(email)
    if (!result.ok) {
      setState({ kind: "error", message: result.error })
      return
    }

    setEmail("")
    const alreadySubscribed = result.data.status === "already_subscribed"
    setState({
      kind: "done",
      message: alreadySubscribed
        ? "You're already subscribed to our newsletter."
        : "Thank you for subscribing. Check your inbox for a welcome email.",
    })

    if (!alreadySubscribed) {
      setShowConfirmation(true)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = setTimeout(
        () => setShowConfirmation(false),
        CONFIRMATION_AUTO_DISMISS_MS
      )
    }
  }

  return (
    <>
      {showConfirmation && (
        <div className="fixed top-24 right-4 lg:right-12 z-50 flex items-center gap-2 border border-black bg-white px-6 py-4 shadow-lg">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 8.5L6 12.5L14 3.5"
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[12px] lg:text-[13px] font-bold uppercase tracking-widest text-black">
            Subscription confirmed
          </span>
        </div>
      )}

      <form
        onSubmit={submit}
        className="flex flex-col small:flex-row items-center justify-center gap-2 w-full max-w-[287px] small:max-w-none"
      >
        <div className="flex flex-col border border-gray-300 bg-white text-left px-3 relative w-full small:w-[287px] h-[42px] justify-center">
          <label htmlFor="newsletter-form-email-input" className="sr-only">
            E-mail
          </label>
          <input
            id="newsletter-form-email-input"
            name="email"
            type="email"
            autoComplete="email"
            aria-required="true"
            aria-describedby="newsletter-form-status"
            placeholder="E-mail"
            required
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (state.kind === "error" || state.kind === "done") setState({ kind: "idle" })
            }}
            className="w-full bg-transparent text-[12px] font-normal text-[#111111] focus:outline-none placeholder:text-gray-800"
          />
        </div>

        <button
          id="newsletter-form-submit-button"
          type="submit"
          disabled={state.kind === "submitting"}
          className="h-[42px] w-full small:w-auto min-w-[140px] border border-black bg-white px-6 text-[12px] font-bold tracking-normal text-black transition-colors hover:bg-black hover:text-white disabled:opacity-60 disabled:hover:bg-white disabled:hover:text-black"
        >
          {state.kind === "submitting" ? "SIGNING UP..." : "SIGN UP NOW"}
        </button>
      </form>

      <p
        id="newsletter-form-status"
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-[18px] text-[12px] ${state.kind === "error" ? "text-sale" : "text-[#111111]"}`}
      >
        {state.kind === "done" || state.kind === "error" ? state.message : ""}
      </p>
    </>
  )
}
