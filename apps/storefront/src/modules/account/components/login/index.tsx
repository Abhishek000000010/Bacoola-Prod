import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useActionState, useState, type FormEvent } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
)

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  // "Complete this field" is only fair once the user has actually tried to
  // submit; before that an untouched empty field is not an error.
  const [submitted, setSubmitted] = useState(false)

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  }

  const handleEmailBlur = () => {
    setEmailError(email ? !validateEmail(email) : submitted)
  }

  const handlePasswordBlur = () => {
    setPasswordError(password ? false : submitted)
  }

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

  return (
    <div
      className="w-full flex flex-col items-start"
      data-testid="login-page"
    >
      <h1 className="text-base font-semibold tracking-wider uppercase text-black mb-8">
        Sign in
      </h1>

      {message?.state === "verification_required" && (
        <div
          className="w-full mb-6 text-center text-xs lg:text-sm font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 p-4"
          data-testid="login-verification-message"
        >
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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError && validateEmail(e.target.value)) setEmailError(false)
              }}
              onBlur={handleEmailBlur}
              className={`peer w-full h-[42px] px-4 pt-[22px] pb-[6px] border ${emailError ? 'border-[#b91c1c]' : 'border-black focus:border-black'} transition-colors focus:ring-0 focus:outline-none rounded-none text-[12px] lg:text-[14px] leading-none text-black bg-transparent`}
              data-testid="email-input"
            />
            <label
              htmlFor="email"
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

        {/* Password Input */}
        <div className="w-full flex flex-col gap-y-1">
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              required
              autoComplete="current-password"
              placeholder=" "
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (passwordError && e.target.value) setPasswordError(false)
              }}
              onBlur={handlePasswordBlur}
              className={`peer w-full h-[42px] pl-4 pr-12 pt-[22px] pb-[6px] border ${passwordError ? 'border-[#b91c1c]' : 'border-black focus:border-black'} transition-colors focus:ring-0 focus:outline-none rounded-none text-[12px] lg:text-[14px] leading-none text-black bg-transparent`}
              data-testid="password-input"
            />
            <label
              htmlFor="password"
              data-no-global-float
              className={`absolute left-4 top-[7px] z-10 text-[12px] lg:text-[14px] leading-none transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-[7px] peer-focus:translate-y-0 pointer-events-none ${
                passwordError ? 'text-[#b91c1c]' : 'text-black'
              }`}
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

        {/* Stay Signed In Checkbox */}
        <div className="flex items-center">
          <label className="flex items-center gap-x-3 cursor-pointer select-none text-[12px] lg:text-[14px] text-black font-medium tracking-wider">
            <div className="relative flex items-center justify-center w-[18px] h-[18px] border-[2px] border-black">
              <input
                type="checkbox"
                className="peer absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="hidden peer-checked:block w-[10px] h-[10px] bg-black"></div>
            </div>
            <span>Stay signed in</span>
          </label>
        </div>

        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />

        {/* Action Buttons */}
        <div className="flex flex-col gap-y-3 mt-2">
          <button
            type="submit"
            className="w-full h-[42px] border border-black bg-black text-white hover:bg-white hover:text-black font-semibold text-xs lg:text-sm tracking-wider uppercase transition-colors rounded-none flex items-center justify-center"
            data-testid="sign-in-button"
          >
            Sign in
          </button>
          
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
            className="w-full h-[42px] bg-white border border-black hover:border-neutral-400 hover:text-neutral-400 text-black font-semibold text-xs lg:text-sm tracking-wider uppercase transition-colors rounded-none flex items-center justify-center"
            data-testid="register-button"
          >
            Create Account
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => setCurrentView(LOGIN_VIEW.FORGOT_PASSWORD)}
        className="nav-underline w-fit text-[12px] lg:text-[14px] font-semibold tracking-wider text-black uppercase mt-8 transition-colors"
      >
        Forgotten your password?
      </button>
    </div>
  )
}

export default Login
