"use client"

import { useEffect, useRef, useState } from "react"
import { unsubscribeFromNewsletter } from "@lib/data/newsletter"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type State =
  | { kind: "working" }
  | { kind: "done"; email: string }
  | { kind: "error"; message: string }

/**
 * Unsubscribes on arrival. It runs in the browser on purpose: mail scanners
 * that pre-open links don't execute scripts, so they can't unsubscribe anyone.
 */
export default function UnsubscribeConfirm({ token }: { token: string }) {
  const [state, setState] = useState<State>(
    token ? { kind: "working" } : { kind: "error", message: "This unsubscribe link is incomplete." }
  )
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    unsubscribeFromNewsletter(token).then((result) =>
      setState(
        result.ok
          ? { kind: "done", email: result.data.email }
          : { kind: "error", message: result.error }
      )
    )
  }, [token])

  return (
    <div role="status" aria-live="polite" className="max-w-md text-[12px] lg:text-[14px] leading-relaxed">
      {state.kind === "working" && <p>Unsubscribing…</p>}
      {state.kind === "done" && (
        <p>
          <strong>{state.email}</strong> has been unsubscribed. You won&apos;t receive our
          newsletter anymore. Changed your mind? You can sign up again at the bottom of any page.
        </p>
      )}
      {state.kind === "error" && <p className="text-sale">{state.message}</p>}
      <LocalizedClientLink href="/" className="nav-underline mt-8 inline-block font-bold uppercase">
        Continue shopping
      </LocalizedClientLink>
    </div>
  )
}
