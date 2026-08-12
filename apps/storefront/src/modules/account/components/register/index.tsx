"use client"

import { useActionState, useState, type FormEvent } from "react"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NativeSelect from "@modules/common/components/native-select"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
)

type FieldName = "first_name" | "last_name" | "email" | "password" | "phone"

const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)
  const [showPassword, setShowPassword] = useState(false)
  const [values, setValues] = useState<Record<FieldName, string>>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
  })
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  // "Complete this field" is only fair once the user has actually tried to
  // submit; before that an untouched empty field is not an error.
  const [submitted, setSubmitted] = useState(false)

  const errorFor = (name: FieldName, value: string, wasSubmitted: boolean) => {
    if (!value) {
      return wasSubmitted ? "Complete this field to continue" : undefined
    }
    if (name === "email" && !validateEmail(value)) {
      return "Check your e-mail format (e.g. name@email.com)"
    }
    return undefined
  }

  const handleChange = (name: FieldName) => (value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear a live error as soon as the input becomes valid, but never raise a
    // new one mid-typing.
    setErrors((prev) =>
      prev[name] && !errorFor(name, value, submitted)
        ? { ...prev, [name]: undefined }
        : prev
    )
  }

  const handleBlur = (name: FieldName) => () => {
    setErrors((prev) => ({
      ...prev,
      [name]: errorFor(name, values[name], submitted),
    }))
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    setSubmitted(true)
    const next: Partial<Record<FieldName, string>> = {}
    ;(Object.keys(values) as FieldName[]).forEach((name) => {
      next[name] = errorFor(name, values[name], true)
    })
    setErrors(next)
    if (Object.values(next).some(Boolean)) {
      e.preventDefault()
    }
  }

  const inputClass = (name: FieldName, extra = "") =>
    `peer w-full h-[42px] pt-[20px] pb-[6px] border ${
      errors[name] ? "border-[#b91c1c]" : "border-black focus:border-black"
    } transition-colors focus:ring-0 focus:outline-none rounded-none text-sm leading-none text-black bg-transparent ${extra}`

  const labelClass = (name: FieldName) =>
    `absolute left-4 top-[5px] z-10 text-[12px] lg:text-[14px] leading-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-xs lg:text-sm peer-focus:top-[5px] peer-focus:translate-y-0 peer-focus:text-[12px] lg:text-[14px] lowercase peer-placeholder-shown:normal-case pointer-events-none ${
      errors[name] ? "text-[#b91c1c]" : "text-black"
    }`

  return (
    <div
      className="w-full flex flex-col items-start animate-fade-in"
      data-testid="register-page"
    >
      <h1 className="text-base font-semibold tracking-wider uppercase text-black mb-8">
        Create your account
      </h1>

      {message?.state === "verification_required" && (
        <div
          className="w-full mb-6 text-center text-xs lg:text-sm font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 p-4"
          data-testid="register-verification-message"
        >
          We sent a verification link to <strong>{message.email}</strong>.
          Please check your inbox to verify your email, then sign in.
        </div>
      )}

      <form
        className="w-full flex flex-col gap-y-6"
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
      >
        {/* First Name Input */}
        <div className="w-full flex flex-col gap-y-1">
          <div className="relative w-full">
            <input
              type="text"
              name="first_name"
              id="first_name"
              required
              autoComplete="given-name"
              placeholder=" "
              value={values.first_name}
              onChange={(e) => handleChange("first_name")(e.target.value)}
              onBlur={handleBlur("first_name")}
              className={inputClass("first_name", "px-4")}
              data-testid="first-name-input"
            />
            <label
              htmlFor="first_name"
              data-no-global-float
              className={labelClass("first_name")}
            >
              First name
            </label>
          </div>
          {errors.first_name && (
            <span className="text-[12px] lg:text-[14px] text-[#b91c1c]">
              {errors.first_name}
            </span>
          )}
        </div>

        {/* Last Name Input */}
        <div className="w-full flex flex-col gap-y-1">
          <div className="relative w-full">
            <input
              type="text"
              name="last_name"
              id="last_name"
              required
              autoComplete="family-name"
              placeholder=" "
              value={values.last_name}
              onChange={(e) => handleChange("last_name")(e.target.value)}
              onBlur={handleBlur("last_name")}
              className={inputClass("last_name", "px-4")}
              data-testid="last-name-input"
            />
            <label
              htmlFor="last_name"
              data-no-global-float
              className={labelClass("last_name")}
            >
              Last name
            </label>
          </div>
          {errors.last_name && (
            <span className="text-[12px] lg:text-[14px] text-[#b91c1c]">
              {errors.last_name}
            </span>
          )}
        </div>

        {/* Email Input */}
        <div className="w-full flex flex-col gap-y-1">
          <div className="relative w-full">
            <input
              type="email"
              name="email"
              id="email"
              required
              autoComplete="email"
              placeholder=" "
              value={values.email}
              onChange={(e) => handleChange("email")(e.target.value)}
              onBlur={handleBlur("email")}
              className={inputClass("email", "px-4")}
              data-testid="email-input"
            />
            <label
              htmlFor="email"
              data-no-global-float
              className={labelClass("email")}
            >
              Email
            </label>
          </div>
          {errors.email && (
            <span className="text-[12px] lg:text-[14px] text-[#b91c1c]">{errors.email}</span>
          )}
        </div>

        {/* Password Input */}
        <div className="w-full flex flex-col gap-y-1">
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              required
              autoComplete="new-password"
              placeholder=" "
              value={values.password}
              onChange={(e) => handleChange("password")(e.target.value)}
              onBlur={handleBlur("password")}
              className={inputClass("password", "pl-4 pr-12")}
              data-testid="password-input"
            />
            <label
              htmlFor="password"
              data-no-global-float
              className={labelClass("password")}
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
          {errors.password && (
            <span className="text-[12px] lg:text-[14px] text-[#b91c1c]">
              {errors.password}
            </span>
          )}
        </div>

        {/* Phone Input with Country Code Selector */}
        <div className="w-full flex flex-col gap-y-1">
        <div
          className={`flex border ${
            errors.phone ? "border-[#b91c1c]" : "border-black focus-within:border-black"
          } transition-colors rounded-none w-full h-[42px]`}
        >
          <NativeSelect
            defaultValue="+91"
            placeholder="+91"
            aria-label="Country calling code"
            wrapperClassName="h-full"
            triggerClassName="h-full cursor-pointer pl-3 pr-7 text-black"
            listClassName="left-0 w-24"
          >
            <option value="+91">+91</option>
            <option value="+1">+1</option>
            <option value="+44">+44</option>
            <option value="+971">+971</option>
          </NativeSelect>
          <div className="w-[1px] h-6 bg-neutral-200 self-center" />
          <input
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            placeholder="Mobile"
            value={values.phone}
            onChange={(e) => handleChange("phone")(e.target.value)}
            onBlur={handleBlur("phone")}
            className="flex-1 h-full px-4 border-0 focus:ring-0 focus:outline-none text-[12px] lg:text-[14px] placeholder:text-[12px] lg:text-[14px] placeholder-neutral-500 text-black bg-transparent"
            data-testid="phone-input"
          />
        </div>
        {errors.phone && (
          <span className="text-[12px] lg:text-[14px] text-[#b91c1c]">{errors.phone}</span>
        )}
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start">
          <label className="flex items-start gap-x-3 cursor-pointer select-none text-[12px] lg:text-[14px] text-black font-medium leading-relaxed tracking-wider">
            <div className="relative flex items-center justify-center w-[18px] h-[18px] border-[2px] border-black shrink-0 mt-0.5">
              <input
                type="checkbox"
                className="peer absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="hidden peer-checked:block w-[10px] h-[10px] bg-black"></div>
            </div>
            <span>
              I would like 10% off on my next purchase, plus personalised offers, news and the latest trends
            </span>
          </label>
        </div>

        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />

        {/* Action Button */}
        <div className="flex flex-col gap-y-3 mt-2">
          <button
            type="submit"
            className="w-full h-[42px] border border-black bg-black text-white hover:bg-white hover:text-black font-semibold text-xs lg:text-sm tracking-wider uppercase transition-colors rounded-none flex items-center justify-center"
            data-testid="register-button"
          >
            Create Account
          </button>
        </div>
      </form>

      {/* Switch View Link */}
      <span className="text-center text-xs lg:text-sm mt-8 text-black">
        Already have an account?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline font-semibold hover:text-neutral-600 transition-colors"
          type="button"
        >
          Sign in
        </button>
      </span>

      {/* Terms Disclaimer */}
      <span className="text-center text-[12px] lg:text-[14px] text-neutral-500 leading-normal max-w-sm mt-8">
        By creating an account and subscribing, you confirm that you have read our{" "}
        <LocalizedClientLink
          href="/content/privacy-policy"
          className="underline hover:text-black transition-colors"
        >
          Privacy Policy
        </LocalizedClientLink>{" "}
        and accept our{" "}
        <LocalizedClientLink
          href="/content/terms-of-use"
          className="underline hover:text-black transition-colors"
        >
          Terms & Conditions
        </LocalizedClientLink>
        .
      </span>
    </div>
  )
}

export default Register
