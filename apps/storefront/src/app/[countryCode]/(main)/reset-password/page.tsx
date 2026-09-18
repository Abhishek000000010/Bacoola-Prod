import { NO_INDEX } from "@lib/util/seo"
import { Metadata } from "next"
import { Suspense } from "react"

import ResetPassword from "@modules/account/components/reset-password"

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Choose a new password for your Bacoola account.",
  robots: NO_INDEX,
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full flex justify-center px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-ui-fg-base">Loading...</p>
        }
      >
        <ResetPassword />
      </Suspense>
    </div>
  )
}
