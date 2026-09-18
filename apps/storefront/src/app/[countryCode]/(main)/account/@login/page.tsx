import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  // Slot pages on the /account route itself skip the title template.
  title: { absolute: "Sign in | Bacoola" },
  description: "Sign in to your Bacoola account to track orders, manage returns and check out faster.",
}

export default function Login() {
  return <LoginTemplate />
}
