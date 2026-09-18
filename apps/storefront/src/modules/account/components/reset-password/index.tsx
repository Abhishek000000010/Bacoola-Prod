"use client"

import { resetPassword } from "@lib/data/customer"
import { Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useSearchParams } from "next/navigation"
import { useState, type FormEvent } from "react"

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
)

type State = "form" | "success" | "missing-token"

const ResetPassword = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [state, setState] = useState<State>(token ? "form" : "missing-token")
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (!token) {
      setState("missing-token")
      return
    }

    setSubmitting(true)
    const result = await resetPassword(token, password)
    setSubmitting(false)

    if (result.success) {
      setState("success")
    } else {
      setError(result.error ?? "Something went wrong. Please try again.")
    }
  }

  if (state === "missing-token") {
    return (
      <div
        className="max-w-sm w-full flex flex-col items-center text-center gap-y-4"
        data-testid="reset-password-invalid"
      >
        <h1 className="text-large-semi uppercase">Reset password</h1>
        <p className="text-base-regular text-ui-fg-base">
          This reset link is invalid or has expired. Request a new one from
          the sign-in page.
        </p>
        <LocalizedClientLink href="/account">
          <Button variant="secondary">Go to sign in</Button>
        </LocalizedClientLink>
      </div>
    )
  }

  if (state === "success") {
    return (
      <div
        className="max-w-sm w-full flex flex-col items-center text-center gap-y-4"
        data-testid="reset-password-success"
      >
        <h1 className="text-large-semi uppercase">Password updated</h1>
        <p className="text-base-regular text-ui-fg-base">
          Your password has been reset. You can now sign in with your new
          password.
        </p>
        <LocalizedClientLink href="/account">
          <Button variant="primary">Go to sign in</Button>
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div
      className="max-w-sm w-full flex flex-col items-start"
      data-testid="reset-password-page"
    >
      <h1 className="text-base font-semibold tracking-wider uppercase text-black mb-8">
        Set a new password
      </h1>

      <form
        className="w-full flex flex-col gap-y-6"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="w-full flex flex-col gap-y-1">
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="new-password"
              required
              autoComplete="new-password"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="peer w-full h-[42px] pl-4 pr-12 pt-[22px] pb-[6px] border border-black focus:border-black transition-colors focus:ring-0 focus:outline-none rounded-none text-[12px] lg:text-[14px] leading-none text-black bg-transparent"
              data-testid="new-password-input"
            />
            <label
              htmlFor="new-password"
              data-no-global-float
              className="absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[7px] peer-focus:translate-y-0 pointer-events-none text-black"
            >
              New password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black transition-colors focus:outline-none"
            >
              {showPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col gap-y-1">
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              id="confirm-password"
              required
              autoComplete="new-password"
              placeholder=" "
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="peer w-full h-[42px] px-4 pt-[22px] pb-[6px] border border-black focus:border-black transition-colors focus:ring-0 focus:outline-none rounded-none text-[12px] lg:text-[14px] leading-none text-black bg-transparent"
              data-testid="confirm-password-input"
            />
            <label
              htmlFor="confirm-password"
              data-no-global-float
              className="absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[7px] peer-focus:translate-y-0 pointer-events-none text-black"
            >
              Confirm password
            </label>
          </div>
        </div>

        {error && (
          <span className="text-[12px] lg:text-[14px] text-[#b91c1c]">{error}</span>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-[42px] border border-black bg-black text-white hover:bg-white hover:text-black disabled:opacity-50 font-semibold text-xs lg:text-sm tracking-wider uppercase transition-colors rounded-none flex items-center justify-center"
          data-testid="reset-password-submit"
        >
          {submitting ? "Saving..." : "Set new password"}
        </button>
      </form>
    </div>
  )
}

export default ResetPassword
