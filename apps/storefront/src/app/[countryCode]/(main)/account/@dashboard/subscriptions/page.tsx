import React from "react"
import { Metadata } from "next"
import { getNewsletterPreferences } from "@lib/data/newsletter"
import SubscriptionsForm from "@modules/account/components/subscriptions-form"

export const metadata: Metadata = {
  title: "My Subscriptions",
  description: "Manage your newsletter and notification preferences.",
}

export default async function Subscriptions() {
  const preferences = await getNewsletterPreferences()

  return (
    <div className="w-full max-w-[500px] mx-auto pt-0 font-sans text-[#111111]">
      <div className="mb-12">
        <h1 className="text-[12px] lg:text-[14px] sm:text-[15px] font-bold uppercase tracking-[0.05em] mb-4">
          My subscriptions
        </h1>
        <p className="text-[12px] lg:text-[14px] font-normal tracking-wide leading-relaxed">
          Manage your newsletter preferences. To unsubscribe, uncheck e-mail and save.
        </p>
      </div>

      <SubscriptionsForm initial={preferences ?? { subscribed: false, interests: [] }} />
    </div>
  )
}
