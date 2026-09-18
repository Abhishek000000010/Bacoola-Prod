"use client"

import { login } from "@lib/data/customer"
import Register from "@modules/account/components/register"
import ForgotPassword from "@modules/account/components/forgot-password"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useActionState, useEffect, useState, type FormEvent } from "react"

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
)

const Check = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-black shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const CheckoutAuth = () => {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const countryCode = (params?.countryCode as string) || ""

  const [view, setView] = useState<"sign-in" | "register" | "forgot">("sign-in")
  const [message, formAction] = useActionState(login, null)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // On a successful sign-in the server page needs to re-render so it sees the
  // authenticated customer and drops the gate for the real checkout form.
  useEffect(() => {
    if (message?.state === "success") {
      router.refresh()
    }
  }, [message, router])

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    setSubmitted(true)
    const emailInvalid = !email || !validateEmail(email)
    const passwordInvalid = !password
    setEmailError(emailInvalid)
    setPasswordError(passwordInvalid)
    if (emailInvalid || passwordInvalid) {
      e.preventDefault()
    }
  }

  const continueAsGuest = () => {
    router.push(`${pathname}?guest=1&step=address`)
  }

  if (view === "register") {
    return (
      <div className="w-full flex flex-col items-center px-4 pt-12 pb-8 bg-white select-none">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <Register setCurrentView={(v) => setView(v === LOGIN_VIEW.SIGN_IN ? "sign-in" : "register")} />
          <button
            type="button"
            onClick={continueAsGuest}
            className="mt-8 text-[12px] lg:text-[14px] font-bold text-black underline underline-offset-4 hover:text-neutral-600 transition-colors"
          >
            Continue as a guest
          </button>
        </div>
      </div>
    )
  }

  if (view === "forgot") {
    return (
      <div className="w-full flex flex-col items-center px-4 pt-12 pb-8 bg-white select-none">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <ForgotPassword setCurrentView={() => setView("sign-in")} />
          <button
            type="button"
            onClick={continueAsGuest}
            className="mt-8 text-[12px] lg:text-[14px] font-bold text-black underline underline-offset-4 hover:text-neutral-600 transition-colors"
          >
            Continue as a guest
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center px-4 pt-12 pb-8 bg-white select-none">
      <div className="w-full max-w-[420px] flex flex-col items-start">
        <h1 className="text-base font-semibold tracking-wider uppercase text-black mb-8">
          Sign in
        </h1>

        {message?.state === "verification_required" && (
          <div className="w-full mb-6 text-center text-xs lg:text-sm font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 p-4">
            We sent a verification link to <strong>{message.email}</strong>.
            Please verify your email, then sign in.
          </div>
        )}

        <form
          className="w-full flex flex-col gap-y-6"
          action={formAction}
          onSubmit={handleSubmit}
          noValidate
        >
          {/* Email */}
          <div className="w-full flex flex-col gap-y-1">
            <div className="relative w-full">
              <input
                type="email"
                name="email"
                id="checkout-email"
                required
                autoComplete="email"
                placeholder=" "
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError && validateEmail(e.target.value)) setEmailError(false)
                }}
                onBlur={() => setEmailError(email ? !validateEmail(email) : submitted)}
                className={`peer w-full h-[42px] px-4 pt-[22px] pb-[6px] border ${emailError ? 'border-[#b91c1c]' : 'border-black focus:border-black'} transition-colors focus:ring-0 focus:outline-none rounded-none text-[12px] lg:text-[14px] leading-none text-black bg-transparent`}
              />
              <label
                htmlFor="checkout-email"
                data-no-global-float
                className={`absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[7px] peer-focus:translate-y-0 pointer-events-none ${emailError ? 'text-[#b91c1c]' : 'text-black'}`}
              >
                E-mail
              </label>
            </div>
            {emailError && (
              <span className="text-[12px] lg:text-[14px] text-[#b91c1c]">
                {!email ? "Complete this field to continue" : "Check your e-mail format (e.g. name@email.com)"}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="w-full flex flex-col gap-y-1">
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="checkout-password"
                required
                autoComplete="current-password"
                placeholder=" "
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError && e.target.value) setPasswordError(false)
                }}
                onBlur={() => setPasswordError(password ? false : submitted)}
                className={`peer w-full h-[42px] pl-4 pr-12 pt-[22px] pb-[6px] border ${passwordError ? 'border-[#b91c1c]' : 'border-black focus:border-black'} transition-colors focus:ring-0 focus:outline-none rounded-none text-[12px] lg:text-[14px] leading-none text-black bg-transparent`}
              />
              <label
                htmlFor="checkout-password"
                data-no-global-float
                className={`absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[7px] peer-focus:translate-y-0 pointer-events-none ${passwordError ? 'text-[#b91c1c]' : 'text-black'}`}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black transition-colors focus:outline-none"
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
            {passwordError && (
              <span className="text-[12px] lg:text-[14px] text-[#b91c1c]">Complete this field to continue</span>
            )}
          </div>

          {/* Stay signed in */}
          <div className="flex items-center">
            <label className="flex items-center gap-x-3 cursor-pointer select-none text-[12px] lg:text-[14px] text-black font-medium tracking-wider">
              <div className="relative flex items-center justify-center w-[18px] h-[18px] border-[2px] border-black">
                <input type="checkbox" className="peer absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                <div className="hidden peer-checked:block w-[10px] h-[10px] bg-black"></div>
              </div>
              <span>Stay signed in</span>
            </label>
          </div>

          <ErrorMessage error={message?.state === "error" ? message.error : null} />

          <button
            type="submit"
            className="w-full h-[42px] border border-black bg-black text-white hover:bg-white hover:text-black font-semibold text-xs lg:text-sm tracking-wider uppercase transition-colors rounded-none flex items-center justify-center"
          >
            Sign in
          </button>
        </form>

        <button
          type="button"
          onClick={() => setView("forgot")}
          className="nav-underline w-fit text-[12px] lg:text-[14px] font-bold tracking-wider text-black uppercase mt-8"
        >
          Forgotten your password?
        </button>

        {/* Create account */}
        <div className="w-full mt-16">
          <h2 className="text-base font-semibold tracking-wider uppercase text-black mb-6">
            Create your account
          </h2>
          <div className="flex flex-col gap-y-3 mb-8">
            <div className="flex items-center gap-x-3 text-[12px] lg:text-[14px] text-black">
              <Check /> Save your details to shop more comfortably
            </div>
            <div className="flex items-center gap-x-3 text-[12px] lg:text-[14px] text-black">
              <Check /> Track and manage your order more easily
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView("register")}
            className="w-full h-[42px] bg-white border border-black text-black hover:bg-black hover:text-white font-semibold text-xs lg:text-sm tracking-wider uppercase transition-colors rounded-none flex items-center justify-center"
          >
            Create Account
          </button>
        </div>

        <div className="w-full flex justify-center mt-10">
          <button
            type="button"
            onClick={continueAsGuest}
            className="text-[12px] lg:text-[14px] font-bold text-black underline underline-offset-4 hover:text-neutral-600 transition-colors"
          >
            Continue as a guest
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutAuth
