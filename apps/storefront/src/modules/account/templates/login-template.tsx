"use client"

import { useState } from "react"

import Register from "@modules/account/components/register"
import Login from "@modules/account/components/login"
import ForgotPassword from "@modules/account/components/forgot-password"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
  FORGOT_PASSWORD = "forgot-password",
}

const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState<LOGIN_VIEW>(LOGIN_VIEW.SIGN_IN)

  return (
    <div className="w-full min-h-[50vh] flex flex-col justify-between items-center px-4 pt-12 pb-4 bg-white select-none">
      {/* Centered form wrapper */}
      <div className="w-full max-w-[340px] flex flex-col items-center">
        {currentView === LOGIN_VIEW.SIGN_IN && (
          <Login setCurrentView={setCurrentView} />
        )}
        {currentView === LOGIN_VIEW.REGISTER && (
          <Register setCurrentView={setCurrentView} />
        )}
        {currentView === LOGIN_VIEW.FORGOT_PASSWORD && (
          <ForgotPassword setCurrentView={setCurrentView} />
        )}
      </div>

    </div>
  )
}

export default LoginTemplate
