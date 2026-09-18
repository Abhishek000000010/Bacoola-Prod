import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Bacoola account to track orders, manage returns and check out faster.",
}

export default function DefaultLogin() {
  return <LoginTemplate />
}
