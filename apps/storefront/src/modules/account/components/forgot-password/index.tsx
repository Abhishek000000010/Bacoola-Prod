"use client"

import { requestPasswordReset } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment, useState, type FormEvent } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

const ForgotPassword = ({ setCurrentView }: Props) => {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateEmail(email)) {
      setEmailError(true)
      return
    }

    setEmailError(false)
    setSubmitting(true)
    await requestPasswordReset(email)
    setSubmitting(false)
    // Always show the same confirmation, whether or not the address has an
    // account — anything else would let this form be used to check which
    // emails are registered.
    setSent(true)
  }

  return (
    <div
      className="w-full flex flex-col items-start"
      data-testid="forgot-password-page"
    >
      <h1 className="text-base font-semibold tracking-wider uppercase text-black mb-8">
        Reset your password
      </h1>
      <p className="text-[12px] lg:text-[14px] text-neutral-600 mb-8">
        Enter the email address on your account and we'll send you a link to
        reset your password.
      </p>

      <form
        className="w-full flex flex-col gap-y-6"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="w-full flex flex-col gap-y-1">
          <div className="relative w-full">
            <input
              type="email"
              name="email"
              id="forgot-password-email"
              required
              autoComplete="email"
              placeholder=" "
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError && validateEmail(e.target.value)) setEmailError(false)
              }}
              onBlur={() => setEmailError(email ? !validateEmail(email) : false)}
              className={`peer w-full h-[42px] px-4 pt-[22px] pb-[6px] border ${emailError ? 'border-[#b91c1c]' : 'border-black focus:border-black'} transition-colors focus:ring-0 focus:outline-none rounded-none text-[12px] lg:text-[14px] leading-none text-black bg-transparent`}
              data-testid="forgot-password-email-input"
            />
            <label
              htmlFor="forgot-password-email"
              data-no-global-float
              className={`absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[7px] peer-focus:translate-y-0 pointer-events-none ${
                emailError ? 'text-[#b91c1c]' : 'text-black'
              }`}
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

        <div className="flex flex-col gap-y-3 mt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-[42px] border border-black bg-black text-white hover:bg-white hover:text-black disabled:opacity-50 font-semibold text-xs lg:text-sm tracking-wider uppercase transition-colors rounded-none flex items-center justify-center"
            data-testid="forgot-password-submit"
          >
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
        className="nav-underline w-fit text-[12px] lg:text-[14px] font-semibold tracking-wider text-black uppercase mt-8 transition-colors"
      >
        Back to sign in
      </button>

      <Transition appear show={sent} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[75]"
          onClose={() => setSent(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  data-testid="forgot-password-sent-modal"
                  className="relative w-full max-w-[400px] bg-white rounded-none px-8 py-12 flex flex-col items-center text-center"
                >
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    aria-label="Close"
                    className="absolute right-5 top-5 text-black hover:text-neutral-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>

                  <Dialog.Title className="text-base font-semibold tracking-wider uppercase text-black mb-5">
                    Almost there!
                  </Dialog.Title>

                  <p className="text-[12px] lg:text-[14px] text-neutral-600 leading-relaxed mb-10">
                    We have sent you a link to reset your password.
                  </p>

                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="w-full h-[46px] border border-black bg-black text-white hover:bg-white hover:text-black font-semibold text-xs lg:text-sm tracking-wider uppercase transition-colors rounded-none flex items-center justify-center"
                    data-testid="forgot-password-sent-modal-close"
                  >
                    Got it
                  </button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

export default ForgotPassword
